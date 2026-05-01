import { EmbedBuilder } from 'discord.js';
import { searchAndPlayRelatedSong } from '../services/autoplay.js';
import { scheduleDisconnect } from '../services/timers.js';
import { formatTime } from '../utils/formatTime.js';

export default function registerPlayerEndEvent(kazagumo, client) {
    kazagumo.on('playerEnd', async (player) => {
        try {
            const guild = client.guilds.cache.get(player.guildId);
            if (!guild) {
                try { await player.destroy(); } catch (e) {}
                return;
            }

            const mode = player._loopMode ?? 'off';
            const endedTrack = player.queue.current;
            let queueLength = player.queue.length;

            if (mode === 'track' && endedTrack && queueLength === 0) {
                player.queue.add(endedTrack);
            } else if (mode === 'queue' && endedTrack && queueLength === 0 && player.queue.previous.length > 0) {
                const ordered = [...player.queue.previous].reverse();
                for (const t of ordered) {
                    player.queue.add(t);
                }
            }
            queueLength = player.queue.length;

            console.log(`🎵 Track ended | Guild: ${player.guildId} | Queue remaining: ${queueLength} | Was: ${endedTrack?.title}`);

            if (queueLength > 0) {
                await new Promise(resolve => setTimeout(resolve, 400));
                const nextTrack = player.queue.current;
                if (nextTrack && player.textId) {
                    const channel = guild.channels.cache.get(player.textId);
                    if (channel) {
                        const embed = new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle('🎵 Now playing')
                            .setDescription(`**[${nextTrack.title}](${nextTrack.uri})**`)
                            .addFields(
                                { name: '👤 Requested by', value: `${nextTrack.requester}`, inline: true },
                                { name: '⏱️ Duration', value: nextTrack.length > 0 ? formatTime(nextTrack.length) : 'Live', inline: true }
                            )
                            .setThumbnail(nextTrack.thumbnail || null)
                            .setTimestamp();
                        await channel.send({ embeds: [embed] }).catch(err => console.error('Error sending now playing:', err));
                    }
                }
            } else {
                if (player._autoplay) {
                    const success = await searchAndPlayRelatedSong(player, kazagumo, client, guild);
                    if (!success) {
                        player._autoplay = false;
                        scheduleDisconnect(player, kazagumo);
                    }
                } else {
                    scheduleDisconnect(player, kazagumo);
                }
            }
        } catch (error) {
            console.error('Error in playerEnd handler:', error);
        }
    });
}
