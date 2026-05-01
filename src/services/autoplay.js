import { EmbedBuilder } from 'discord.js';
import { formatTime } from '../utils/formatTime.js';
import logger from '../utils/logger.js';
import {
    getAutoplayContext,
    getAutoplayHistory,
    pushAutoplayHistory,
    setAutoplayContext
} from './playerState.js';
import { cancelDisconnect } from './timers.js';
import { AUTOPLAY_DELAY_MS } from '../config/constants.js';

export async function searchAndPlayRelatedSong(player, kazagumo, client, guild) {
    const guildId = player.guildId;
    const contextTrack = getAutoplayContext(guildId) || player.queue.current;

    if (!contextTrack) {
        logger.warn('Sin pista de contexto para auto-reproducir', { guildId });
        return false;
    }

    logger.info('Auto-reproducir: buscando canciones relacionadas', { guildId, context: contextTrack.title });

    try {
        let searchQuery = contextTrack.title;

        const artistMatch = contextTrack.title.match(/^([^-|]+)/);
        if (artistMatch) {
            const artistName = artistMatch[1].trim();
            searchQuery = artistName;
            logger.debug(`Auto-reproducir: artista extraído: ${artistName}`, { guildId });
        } else {
            searchQuery = `radio ${contextTrack.title}`;
        }

        logger.debug(`Auto-reproducir: buscando "${searchQuery}"`, { guildId });

        const result = await kazagumo.search(searchQuery, {
            requester: client.user
        });

        const history = getAutoplayHistory(guildId);

        if (result.tracks && result.tracks.length > 0) {
            const relatedTracks = result.tracks.filter(track => {
                if (track.uri === contextTrack.uri ||
                    (player.queue.current && track.uri === player.queue.current.uri)) {
                    return false;
                }

                const trackTitleLower = track.title.toLowerCase();
                const contextTitleLower = contextTrack.title.toLowerCase();
                if (trackTitleLower === contextTitleLower) {
                    return false;
                }

                const nonMusicKeywords = [
                    'how to', 'tutorial', 'guide', 'tips', 'tricks',
                    'radio concierto', 'emisión en directo', 'live radio',
                    'internet radio', 'licensing', 'keyfob', 'volvo',
                    'things you didn\'t know', 'cassette - radio'
                ];
                const isNonMusic = nonMusicKeywords.some(keyword =>
                    trackTitleLower.includes(keyword)
                );
                if (isNonMusic) {
                    return false;
                }

                const inHistory = history.some(historyTrack => {
                    if (historyTrack.uri === track.uri) return true;
                    const historyTitleLower = historyTrack.title.toLowerCase();
                    const trackWords = trackTitleLower.split(/\s+/).filter(w => w.length > 3);
                    const historyWords = historyTitleLower.split(/\s+/).filter(w => w.length > 3);
                    const commonWords = trackWords.filter(w => historyWords.includes(w));
                    if (commonWords.length >= 2) return true;
                    return false;
                });

                return !inHistory;
            });

            if (relatedTracks.length > 0) {
                const relatedTrack = relatedTracks[0];
                logger.info(`Auto-reproducir: canción encontrada: ${relatedTrack.title}`, { guildId });

                pushAutoplayHistory(guildId, relatedTrack);
                setAutoplayContext(guildId, relatedTrack);

                const wasQueueEmpty = player.queue.length === 0;

                await player.queue.add(relatedTrack);
                cancelDisconnect(guildId);

                if (wasQueueEmpty && player.queue.current) {
                    await player.skip();
                    await new Promise(resolve => setTimeout(resolve, AUTOPLAY_DELAY_MS));
                }

                if (!player.playing) {
                    await player.play();
                    await new Promise(resolve => setTimeout(resolve, AUTOPLAY_DELAY_MS));
                }

                if (player.textId) {
                    const channel =
                        guild.channels.cache.get(player.textId) ||
                        await guild.channels.fetch(player.textId).catch(() => null);
                    if (channel?.isTextBased?.()) {
                        const embed = new EmbedBuilder()
                            .setColor(0x5865F2)
                            .setTitle('🔄 Auto-reproducir')
                            .setDescription(`**Reproduciendo tema relacionado:**\n[${relatedTrack.title}](${relatedTrack.uri})`)
                            .addFields(
                                { name: '⏱️ Duración', value: relatedTrack.length > 0 ? formatTime(relatedTrack.length) : 'En vivo', inline: true }
                            )
                            .setThumbnail(relatedTrack.thumbnail || null)
                            .setTimestamp();

                        try {
                            await channel.send({ embeds: [embed] });
                        } catch (error) {
                            logger.error('Error enviando notificación de auto-reproducir', { guildId, error: error.message });
                        }
                    }
                }
                return true;
            }
            logger.warn('Auto-reproducir: no se encontraron canciones distintas', { guildId });
            return false;
        }
        logger.warn('Auto-reproducir: sin resultados de búsqueda', { guildId });
        return false;
    } catch (autoplayError) {
        logger.error('Error en búsqueda de auto-reproducir', { guildId, error: autoplayError.message });
        return false;
    }
}
