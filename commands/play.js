import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Plays a song or adds to queue')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Song name or URL')
                .setRequired(true)
        ),
    
    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        // Try both 'song' and 'cancion' to support both old and new command registrations
        const query = interaction.options.getString('song') || interaction.options.getString('cancion');
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        console.log(`🎵 Play command | Guild: ${interaction.guild.id} | User: ${interaction.user.tag} | Query: ${query}`);

        if (!voiceChannel) {
            return interaction.editReply('❌ You must be in a voice channel to use this command!');
        }

        // Helper: destroy stale player (session expired after node restart)
        async function destroyStalePlayer() {
            const stale = kazagumo.players.get(interaction.guild.id);
            if (stale) {
                try { await stale.destroy(); } catch (e) { /* ignore */ }
            }
            try {
                if (kazagumo.shoukaku.connections.has(interaction.guild.id)) {
                    kazagumo.shoukaku.connections.get(interaction.guild.id).disconnect();
                    kazagumo.shoukaku.connections.delete(interaction.guild.id);
                }
            } catch (e) { /* ignore */ }
        }

        let _retried = false;
        const attemptPlay = async () => {
        try {
            // Check if player already exists for this guild
            let player = kazagumo.players.get(interaction.guild.id);

            // Verify bot is actually in the voice channel
            const guild = interaction.guild;
            const botMember = guild.members.cache.get(interaction.client.user.id);
            const botVoiceChannel = botMember?.voice?.channel;

            if (player) {
                // Check if bot is actually connected to a voice channel
                if (!botVoiceChannel) {
                    // Bot is not in any channel, but player exists - destroy it
                    console.log('Bot not in voice channel but player exists, destroying player');
                    try {
                        await player.destroy();
                        player = null;
                    } catch (destroyError) {
                        console.error('Error destroying disconnected player:', destroyError);
                        player = null;
                    }
                } else if (player.voiceId !== voiceChannel.id) {
                    // Player exists but is in different channel - move it
                    try {
                        await player.setVoiceChannel(voiceChannel.id);
                    } catch (error) {
                        console.error('Error moving player to new channel:', error);
                        // If move fails, destroy old player and create new one
                        try {
                            await player.destroy();
                            player = null;
                        } catch (destroyError) {
                            console.error('Error destroying old player:', destroyError);
                            player = null;
                        }
                    }
                }
                
                // Update text channel if player still exists
                if (player) {
                    player.setTextChannel(interaction.channel.id);
                }
            }

            // Create new player if it doesn't exist or was destroyed
            if (!player) {
                const triedNodes = new Set();

                // Build ordered list: all connected nodes first, then iterate all of them
                const allNodes = [...kazagumo.shoukaku.nodes.values()];
                const connectedNodes = allNodes.filter(n => n.state === 1);

                console.log(`   └─ Nodes available: ${allNodes.length} total, ${connectedNodes.length} connected`);
                allNodes.forEach(n => console.log(`      • ${n.name} state=${n.state}`));

                if (connectedNodes.length === 0) {
                    console.warn(`   └─ No connected nodes at all`);
                    return interaction.editReply('❌ No Lavalink nodes are online right now. Please wait a moment and try again!');
                }

                // Try every connected node until one works
                for (const node of connectedNodes) {
                    if (triedNodes.has(node.name)) continue;
                    triedNodes.add(node.name);

                    try {
                        const playerOptions = {
                            guildId: interaction.guild.id,
                            voiceId: voiceChannel.id,
                            textId: interaction.channel.id,
                            deaf: true,
                            nodeName: node.name
                        };

                        console.log(`   └─ Trying node: ${node.name} (${triedNodes.size}/${connectedNodes.length})`);
                        player = await kazagumo.createPlayer(playerOptions);
                        console.log(`   └─ ✅ Connected via node: ${node.name}`);
                        break; // success
                    } catch (createError) {
                        console.error(`   └─ ❌ Node ${node.name} failed: ${createError.message}`);

                        // Clean up partial player/connection state before retrying
                        try {
                            const stale = kazagumo.players.get(interaction.guild.id);
                            if (stale) await stale.destroy();
                        } catch (e) { /* ignore */ }
                        try {
                            if (kazagumo.shoukaku.connections.has(interaction.guild.id)) {
                                kazagumo.shoukaku.connections.get(interaction.guild.id).disconnect();
                                kazagumo.shoukaku.connections.delete(interaction.guild.id);
                            }
                        } catch (e) { /* ignore */ }

                        await new Promise(r => setTimeout(r, 500));
                    }
                }

                if (!player) {
                    console.warn(`   └─ All ${connectedNodes.length} nodes failed`);
                    return interaction.editReply('❌ Could not connect to voice channel. All nodes failed. Please try again!');
                }
            }

            // Search for the track
            console.log(`   └─ Searching for: ${query}`);
            const result = await kazagumo.search(query, {
                requester: interaction.user
            });

            if (!result.tracks.length) {
                console.log(`   └─ ❌ No results found`);
                return interaction.editReply('❌ No results found for your search!');
            }

            const isPlaylist = result.type === 'PLAYLIST';
            const tracksToAdd = isPlaylist ? result.tracks : [result.tracks[0]];
            const track = tracksToAdd[0];
            const queueLengthBefore = player.queue.length;
            const isCurrentlyPlaying = player.playing || player.paused;
            const currentTrack = player.queue.current;

            if (isPlaylist) {
                console.log(`   └─ Playlist: ${result.playlistName ?? 'Unknown'} (${tracksToAdd.length} tracks)`);
            } else {
                console.log(`   └─ Found: ${track.title}`);
            }
            console.log(`   └─ Queue before: ${queueLengthBefore} tracks | Currently playing: ${isCurrentlyPlaying ? currentTrack?.title : 'Nothing'}`);

            for (const t of tracksToAdd) {
                await player.queue.add(t);
            }

            // Update autoplay context when a song is manually added
            if (player._autoplay) {
                player._autoplayContext = track;
                console.log(`   └─ 🔄 Updated autoplay context to: ${track.title}`);
            }

            const queueLengthAfter = player.queue.length;
            console.log(`   └─ ✅ Added to queue | Queue now: ${queueLengthAfter} tracks`);

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setThumbnail(track.thumbnail || null)
                .setTimestamp();

            if (isPlaylist) {
                embed.setTitle('📋 Playlist added')
                    .setDescription(`**${result.playlistName ?? 'Playlist'}** — ${tracksToAdd.length} songs added to queue`)
                    .addFields({ name: '👤 Requested by', value: `${interaction.user}`, inline: true });
            } else {
                embed.setTitle('🎵 Song added')
                    .setDescription(`**[${track.title}](${track.uri})**`)
                    .addFields(
                        { name: '👤 Requested by', value: `${interaction.user}`, inline: true },
                        { name: '⏱️ Duration', value: track.length > 0 ? formatTime(track.length) : 'Live', inline: true }
                    );
            }

            if (!player.playing && !player.paused) {
                try {
                    console.log(`   └─ Starting playback: ${track.title}`);
                    await player.play();
                    if (!isPlaylist) embed.setDescription(`🎵 **Now playing:** [${track.title}](${track.uri})`);
                    console.log(`   └─ ✅ Now playing: ${track.title}`);
                } catch (playError) {
                    console.error(`   └─ ❌ Error starting playback:`, playError);
                }
            } else {
                console.log(`   └─ Added to queue (${queueLengthAfter} total). Currently playing: ${currentTrack?.title}`);
            }

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error in play:', error);

            // Session expired after Lavalink node restart — destroy stale player and retry once
            const isSessionError = error.status === 404 ||
                error.message?.includes('Session not found') ||
                error.message?.includes('session');
            if (isSessionError && !_retried) {
                _retried = true;
                console.warn('   └─ 🔄 Stale session detected, destroying player and retrying...');
                await destroyStalePlayer();
                await new Promise(r => setTimeout(r, 800));
                return attemptPlay();
            }

            // More specific error messages
            let errorMessage = '❌ There was an error playing the song!';
            if (error.message?.includes('404') || error.status === 404) {
                errorMessage = '❌ Connection error. Please try again in a moment!';
            } else if (error.message?.includes('429') || error.status === 429) {
                errorMessage = '❌ Too many requests. Please wait a moment and try again!';
            } else if (error.message?.includes('timeout') || error.message?.includes('handshake')) {
                errorMessage = '❌ Connection timeout. Please try again!';
            }

            await interaction.editReply(errorMessage);
        }
        }; // end attemptPlay
        return attemptPlay();
    }
};

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
