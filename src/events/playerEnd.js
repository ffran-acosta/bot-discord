import { searchAndPlayRelatedSong } from '../services/autoplay.js';
import { incrementSongsPlayed } from '../services/stats.js';
import { scheduleDisconnect } from '../services/timers.js';
import { stopNowPlayingUpdates, syncNowPlayingPanel } from '../services/nowPlayingMessage.js';
import { consumeSkipRequested, getLoopMode, isAutoplay, setAutoplay } from '../services/playerState.js';
import { PLAY_START_DELAY_MS } from '../config/constants.js';
import logger from '../utils/logger.js';

export default function registerPlayerEndEvent(kazagumo, client) {
    // Kazagumo emite playerEnd sincrónicamente, antes de decidir si arranca la siguiente pista:
    // todo lo que modifique la cola tiene que ir antes del primer await.
    kazagumo.on('playerEnd', async (player, endedTrack) => {
        // Sin pista = reason 'replaced' (otra pista ya reemplazó a la actual); no hay nada que hacer.
        if (!endedTrack) return;

        try {
            incrementSongsPlayed(1);

            const guild = client.guilds.cache.get(player.guildId);
            if (!guild) {
                try {
                    await player.destroy();
                } catch {
                    /* ignore */
                }
                return;
            }

            const guildId = player.guildId;
            const mode = getLoopMode(guildId);
            const skipped = consumeSkipRequested(guildId);

            if (mode === 'track' && !skipped) {
                player.queue.unshift(endedTrack);
            } else if (mode === 'queue' && player.queue.length === 0 && player.queue.previous.length > 0) {
                const ordered = [...player.queue.previous].reverse();
                for (const t of ordered) player.queue.add(t);
            }
            const queueLength = player.queue.length;

            logger.info('Pista finalizada', { guildId, track: endedTrack.title, queueRemaining: queueLength });

            if (queueLength > 0) {
                await new Promise(resolve => setTimeout(resolve, PLAY_START_DELAY_MS));
                if (player.queue.current && player.textId) {
                    await syncNowPlayingPanel(client, kazagumo, player).catch(err =>
                        logger.error('Error sincronizando panel de reproducción', { guildId, error: err.message })
                    );
                }
            } else if (isAutoplay(guildId)) {
                const success = await searchAndPlayRelatedSong(player, kazagumo, client, guild);
                if (!success) {
                    setAutoplay(guildId, false);
                    scheduleDisconnect(player, kazagumo);
                    await stopNowPlayingUpdates(client, guildId, 'tracklist');
                } else {
                    await syncNowPlayingPanel(client, kazagumo, player).catch(err =>
                        logger.error('Error sincronizando panel de reproducción (auto-reproducir)', {
                            guildId,
                            error: err.message
                        })
                    );
                }
            } else {
                scheduleDisconnect(player, kazagumo);
                await stopNowPlayingUpdates(client, guildId, 'tracklist');
            }
        } catch (error) {
            logger.error('Error en playerEnd', { guildId: player.guildId, error: error.message, stack: error.stack });
        }
    });
}
