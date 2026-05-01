import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { applyPendingRestoreIfAny } from '../src/services/queuePersistence.js';
import { syncNowPlayingPanel } from '../src/services/nowPlayingMessage.js';
import {
    MAX_PLAYLIST_TRACKS,
    formatTrackDuration,
    hasYoutubeListParameter,
    isLikelySpotifyUrl
} from '../src/utils/playSearchShared.js';

/**
 * Inserta pistas al inicio de la cola (índice 0), delante de las ya encoladas.
 * Si no hay `current`, delega en `queue.add` (mismo comportamiento que /play).
 * @param {import('kazagumo').KazagumoPlayer} player
 * @param {import('kazagumo').KazagumoTrack[]} tracks
 */
function enqueueAtQueueFront(player, tracks) {
    const q = player.queue;
    if (q.current) {
        q.splice(0, 0, ...tracks);
        q.emitChanges();
    } else {
        q.add(tracks);
    }
}

export default {
    data: new SlashCommandBuilder()
        .setName('playnext')
        .setDescription('Search and insert after the current track (front of queue)')
        .addStringOption(option =>
            option
                .setName('song')
                .setDescription('Song name or URL')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        const query = interaction.options.getString('song') || interaction.options.getString('cancion');
        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        console.log(`⏩ Playnext | Guild: ${interaction.guild.id} | User: ${interaction.user.tag} | Query: ${query}`);

        if (!voiceChannel) {
            return interaction.editReply('❌ You must be in a voice channel to use this command!');
        }

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
        const attemptPlaynext = async () => {
            try {
                let player = kazagumo.players.get(interaction.guild.id);
                const guild = interaction.guild;
                const botMember = guild.members.cache.get(interaction.client.user.id);
                const botVoiceChannel = botMember?.voice?.channel;

                if (player) {
                    if (!botVoiceChannel) {
                        console.log('Bot not in voice channel but player exists, destroying player');
                        try {
                            await player.destroy();
                            player = null;
                        } catch (destroyError) {
                            console.error('Error destroying disconnected player:', destroyError);
                            player = null;
                        }
                    } else if (player.voiceId !== voiceChannel.id) {
                        try {
                            await player.setVoiceChannel(voiceChannel.id);
                        } catch (error) {
                            console.error('Error moving player to new channel:', error);
                            try {
                                await player.destroy();
                                player = null;
                            } catch (destroyError) {
                                console.error('Error destroying old player:', destroyError);
                                player = null;
                            }
                        }
                    }

                    if (player) {
                        player.setTextChannel(interaction.channel.id);
                    }
                }

                if (!player) {
                    const triedNodes = new Set();
                    const allNodes = [...kazagumo.shoukaku.nodes.values()];
                    const connectedNodes = allNodes.filter(n => n.state === 1);

                    console.log(`   └─ Nodes available: ${allNodes.length} total, ${connectedNodes.length} connected`);

                    if (connectedNodes.length === 0) {
                        console.warn(`   └─ No connected nodes at all`);
                        return interaction.editReply('❌ No Lavalink nodes are online right now. Please wait a moment and try again!');
                    }

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
                            break;
                        } catch (createError) {
                            console.error(`   └─ ❌ Node ${node.name} failed: ${createError.message}`);

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

                const searchOpts = { requester: interaction.user };
                if (player.shoukaku?.node?.name) {
                    searchOpts.nodeName = player.shoukaku.node.name;
                }

                console.log(`   └─ Searching for: ${query}`);
                const result = await kazagumo.search(query, searchOpts);

                if (!result.tracks.length) {
                    console.log(`   └─ ❌ No results found`);
                    if (isLikelySpotifyUrl(query)) {
                        return interaction.editReply(
                            '❌ **Spotify:** este nodo de Lavalink no devolvió audio para esa URL. ' +
                                'Hace falta un servidor con fuente tipo **LavaSrc / LavaSource** (u otro plugin que resuelva Spotify). ' +
                                'Probá con un enlace de **YouTube** o una búsqueda por texto, o usá un Lavalink propio con el plugin instalado.'
                        );
                    }
                    return interaction.editReply('❌ No results found for your search!');
                }

                let isPlaylist = result.type === 'PLAYLIST';
                let tracksToAdd = isPlaylist ? [...result.tracks] : [result.tracks[0]];

                if (
                    !isPlaylist &&
                    result.type === 'SEARCH' &&
                    result.tracks.length > 1 &&
                    hasYoutubeListParameter(query)
                ) {
                    isPlaylist = true;
                    tracksToAdd = result.tracks.slice(0, MAX_PLAYLIST_TRACKS);
                    console.log(`   └─ YouTube list URL returned SEARCH; treating as playlist (${tracksToAdd.length} tracks)`);
                }

                if (isPlaylist) {
                    tracksToAdd = tracksToAdd.slice(0, MAX_PLAYLIST_TRACKS);
                }

                if (isPlaylist && tracksToAdd.length === 0) {
                    return interaction.editReply('❌ La playlist no tiene pistas cargables (lista vacía o error del nodo).');
                }

                const track = tracksToAdd[0];
                const queueLengthBefore = player.queue.length;
                const isCurrentlyPlaying = player.playing || player.paused;
                const currentTrack = player.queue.current;

                if (isPlaylist) {
                    console.log(`   └─ Playlist (playnext): ${result.playlistName ?? 'Unknown'} (${tracksToAdd.length} tracks)`);
                } else {
                    console.log(`   └─ Found: ${track.title}`);
                }
                console.log(`   └─ Queue before: ${queueLengthBefore} | Current: ${isCurrentlyPlaying ? currentTrack?.title : 'Nothing'}`);

                enqueueAtQueueFront(player, tracksToAdd);

                await applyPendingRestoreIfAny(kazagumo, interaction.client, interaction.guild.id, interaction.user);

                if (player._autoplay) {
                    player._autoplayContext = track;
                    console.log(`   └─ 🔄 Updated autoplay context to: ${track.title}`);
                }

                const queueLengthAfter = player.queue.length;
                console.log(`   └─ ✅ Playnext | Queue now: ${queueLengthAfter} tracks`);

                const embed = new EmbedBuilder()
                    .setColor(0xFEE75C)
                    .setThumbnail(track.thumbnail || null)
                    .setTimestamp();

                if (isPlaylist) {
                    const plTitle = result.playlistName ?? (hasYoutubeListParameter(query) ? 'YouTube playlist' : 'Playlist');
                    embed
                        .setTitle('⏩ Playlist — play next')
                        .setDescription(`**${plTitle}** — ${tracksToAdd.length} song(s) inserted at the front of the queue`)
                        .addFields({ name: '👤 Requested by', value: `${interaction.user}`, inline: true });
                    if (result.tracks.length > tracksToAdd.length) {
                        embed.setFooter({ text: `Showing first ${tracksToAdd.length} tracks (limit ${MAX_PLAYLIST_TRACKS}).` });
                    }
                } else {
                    embed
                        .setTitle('⏩ Play next')
                        .setDescription(`**[${track.title}](${track.uri})** — inserted after the current track`)
                        .addFields(
                            { name: '👤 Requested by', value: `${interaction.user}`, inline: true },
                            { name: '⏱️ Duration', value: track.length > 0 ? formatTrackDuration(track.length) : 'Live', inline: true }
                        );
                }

                if (!player.playing && !player.paused) {
                    try {
                        console.log(`   └─ Starting playback: ${track.title}`);
                        await player.play();
                        if (!isPlaylist) {
                            embed.setDescription(`🎵 **Now playing:** [${track.title}](${track.uri})`);
                        }
                        console.log(`   └─ ✅ Now playing: ${track.title}`);
                    } catch (playError) {
                        console.error(`   └─ ❌ Error starting playback:`, playError);
                    }
                } else {
                    console.log(`   └─ Inserted at queue front (${queueLengthAfter} total). Now: ${currentTrack?.title}`);
                }

                await interaction.editReply({ embeds: [embed] });
                await syncNowPlayingPanel(interaction.client, kazagumo, player).catch(() => {});
            } catch (error) {
                console.error('Error in playnext:', error);

                const isSessionError = error.status === 404 ||
                    error.message?.includes('Session not found') ||
                    error.message?.includes('session');
                if (isSessionError && !_retried) {
                    _retried = true;
                    console.warn('   └─ 🔄 Stale session detected, destroying player and retrying...');
                    await destroyStalePlayer();
                    await new Promise(r => setTimeout(r, 800));
                    return attemptPlaynext();
                }

                let errorMessage = '❌ There was an error with play next!';
                if (error.message?.includes('404') || error.status === 404) {
                    errorMessage = '❌ Connection error. Please try again in a moment!';
                } else if (error.message?.includes('429') || error.status === 429) {
                    errorMessage = '❌ Too many requests. Please wait a moment and try again!';
                } else if (error.message?.includes('timeout') || error.message?.includes('handshake')) {
                    errorMessage = '❌ Connection timeout. Please try again!';
                } else if (isLikelySpotifyUrl(query) && (
                    /spotify|lavalink|load|resolve|plugin|source/i.test(String(error.message))
                )) {
                    errorMessage =
                        '❌ **Spotify:** el nodo no pudo resolver esa URL (suele faltar **LavaSrc** u otra fuente Spotify en Lavalink). ' +
                        'Usá YouTube o texto, o un nodo con el plugin configurado.';
                }

                await interaction.editReply(errorMessage);
            }
        };

        return attemptPlaynext();
    }
};
