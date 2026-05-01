import { searchAndPlayRelatedSong } from '../services/autoplay.js';
import { incrementSongsPlayed } from '../services/stats.js';
import { scheduleDisconnect } from '../services/timers.js';
import { stopNowPlayingUpdates, syncNowPlayingPanel } from '../services/nowPlayingMessage.js';
import logger from '../utils/logger.js';

export default function registerPlayerEndEvent(kazagumo, client) {
    kazagumo.on('playerEnd', async (player) => {
        try {
            incrementSongsPlayed(1);

            const guild = client.guilds.cache.get(player.guildId);
            if (!guild) {
                try { await player.destroy(); } catch { /* ignore */ }
                return;
            }

            const mode = player._loopMode ?? 'off';
            const endedTrack = player.queue.current;
            let queueLength = player.queue.length;

            if (mode === 'track' && endedTrack && queueLength === 0) {
                player.queue.add(endedTrack);
            } else if (mode === 'queue' && endedTrack && queueLength === 0 && player.queue.previous.length > 0) {
                const ordered = [...player.queue.previous].reverse();
                for (const t of ordered) player.queue.add(t);
            }
            queueLength = player.queue.length;

            logger.info('Pista finalizada', { guildId: player.guildId, track: endedTrack?.title, queueRemaining: queueLength });

            if (queueLength > 0) {
                await new Promise(resolve => setTimeout(resolve, 400));
                if (player.queue.current && player.textId) {
                    await syncNowPlayingPanel(client, kazagumo, player).catch(err =>
                        logger.error('Error sincronizando panel now-playing', { error: err.message })
                    );
                }
            } else {
                if (player._autoplay) {
                    const success = await searchAndPlayRelatedSong(player, kazagumo, client, guild);
                    if (!success) {
                        player._autoplay = false;
                        scheduleDisconnect(player, kazagumo);
                        await stopNowPlayingUpdates(client, player.guildId);
                    } else {
                        await syncNowPlayingPanel(client, kazagumo, player).catch(err =>
                            logger.error('Error sincronizando panel now-playing (autoplay)', { error: err.message })
                        );
                    }
                } else {
                    scheduleDisconnect(player, kazagumo);
                    await stopNowPlayingUpdates(client, player.guildId);
                }
            }
        } catch (error) {
            logger.error('Error en playerEnd', { guildId: player.guildId, error: error.message, stack: error.stack });
        }
    });
}
