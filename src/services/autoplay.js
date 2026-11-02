import { EmbedBuilder } from 'discord.js';
import { formatTrackDuration } from '../utils/formatTime.js';
import { COLORS } from '../ui/colors.js';
import logger from '../utils/logger.js';
import { getAutoplayContext, getAutoplayHistory, pushAutoplayHistory, setAutoplayContext } from './playerState.js';
import { cancelDisconnect } from './timers.js';
import { AUTOPLAY_DELAY_MS } from '../config/constants.js';

const NON_MUSIC_KEYWORDS = [
    'how to',
    'tutorial',
    'guide',
    'tips',
    'tricks',
    'radio concierto',
    'emisión en directo',
    'live radio',
    'internet radio',
    'licensing',
    'keyfob',
    'volvo',
    "things you didn't know",
    'cassette - radio'
];

/**
 * Descarta el mismo tema, contenido que no es música y temas parecidos a los ya sonados.
 * @param {{ uri?: string, title: string }} track
 * @param {{ uri?: string, title: string }} contextTrack
 * @param {{ uri?: string } | null | undefined} currentTrack
 * @param {Array<{ uri?: string, title: string }>} history
 */
export function isRelatedCandidate(track, contextTrack, currentTrack, history) {
    if (track.uri === contextTrack.uri || (currentTrack && track.uri === currentTrack.uri)) return false;

    const trackTitleLower = track.title.toLowerCase();
    if (trackTitleLower === contextTrack.title.toLowerCase()) return false;
    if (NON_MUSIC_KEYWORDS.some(keyword => trackTitleLower.includes(keyword))) return false;

    const trackWords = trackTitleLower.split(/\s+/).filter(w => w.length > 3);
    return !history.some(historyTrack => {
        if (historyTrack.uri === track.uri) return true;
        const historyWords = historyTrack.title
            .toLowerCase()
            .split(/\s+/)
            .filter(w => w.length > 3);
        return trackWords.filter(w => historyWords.includes(w)).length >= 2;
    });
}

export async function searchAndPlayRelatedSong(player, kazagumo, client, guild) {
    const guildId = player.guildId;
    const contextTrack = getAutoplayContext(guildId) || player.queue.current;

    if (!contextTrack) {
        logger.warn('Sin pista de contexto para auto-reproducir', { guildId });
        return false;
    }

    logger.info('Auto-reproducir: buscando canciones relacionadas', { guildId, context: contextTrack.title });

    try {
        let searchQuery;
        const artistFromMeta = contextTrack.author?.trim();

        if (artistFromMeta) {
            searchQuery = `${artistFromMeta} mix`;
            logger.debug(`Auto-reproducir: artista desde metadata: ${artistFromMeta}`, { guildId });
        } else {
            const artistMatch = contextTrack.title.match(/^([^-|]+)/);
            if (artistMatch) {
                const artistName = artistMatch[1].trim();
                searchQuery = `${artistName} mix`;
                logger.debug(`Auto-reproducir: artista extraído del título: ${artistName}`, { guildId });
            } else {
                searchQuery = `${contextTrack.title} similar songs mix`;
            }
        }

        logger.debug(`Auto-reproducir: buscando "${searchQuery}"`, { guildId });

        const result = await kazagumo.search(searchQuery, {
            requester: client.user
        });

        const history = getAutoplayHistory(guildId);

        if (result.tracks && result.tracks.length > 0) {
            const relatedTracks = result.tracks.filter(track =>
                isRelatedCandidate(track, contextTrack, player.queue.current, history)
            );

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
                        (await guild.channels.fetch(player.textId).catch(() => null));
                    if (channel?.isTextBased?.()) {
                        const embed = new EmbedBuilder()
                            .setColor(COLORS.primary)
                            .setTitle('🎲 Radio estilo')
                            .setDescription(
                                `**Reproduciendo tema similar:**\n[${relatedTrack.title}](${relatedTrack.uri})`
                            )
                            .addFields({
                                name: '⏱️ Duración',
                                value: formatTrackDuration(relatedTrack.length),
                                inline: true
                            })
                            .setThumbnail(relatedTrack.thumbnail || null)
                            .setTimestamp();

                        try {
                            await channel.send({ embeds: [embed] });
                        } catch (error) {
                            logger.error('Error enviando notificación de auto-reproducir', {
                                guildId,
                                error: error.message
                            });
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
