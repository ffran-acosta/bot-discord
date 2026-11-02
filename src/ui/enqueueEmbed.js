import { EmbedBuilder } from 'discord.js';
import { MAX_PLAYLIST_TRACKS } from '../config/constants.js';
import { formatTrackDuration } from '../utils/formatTime.js';
import { COLORS } from './colors.js';

/**
 * Embed de confirmación de /play y /playnext.
 * @param {{
 *   track: import('kazagumo').KazagumoTrack,
 *   requester: import('discord.js').User,
 *   position: 'end' | 'front',
 *   playlist: { title: string, added: number, total: number } | null
 * }} opts
 */
export function buildEnqueueEmbed({ track, requester, position, playlist }) {
    const front = position === 'front';
    const embed = new EmbedBuilder()
        .setColor(front ? COLORS.warning : COLORS.primary)
        .setThumbnail(track.thumbnail || null)
        .setTimestamp();
    const requesterField = { name: '👤 Pedido por', value: `${requester}`, inline: true };

    if (playlist) {
        embed
            .setTitle(front ? '⏩ Playlist — a continuación' : '📋 Playlist agregada')
            .setDescription(
                front
                    ? `**${playlist.title}** — ${playlist.added} canción(es) insertadas al frente de la cola`
                    : `**${playlist.title}** — ${playlist.added} canción(es) agregadas a la cola`
            )
            .addFields(requesterField);
        if (playlist.total > playlist.added) {
            embed.setFooter({
                text: `Mostrando las primeras ${playlist.added} pistas (límite ${MAX_PLAYLIST_TRACKS}).`
            });
        }
        return embed;
    }

    return embed
        .setTitle(front ? '⏩ Reproducir a continuación' : '🎵 Canción agregada')
        .setDescription(
            front
                ? `**[${track.title}](${track.uri})** — insertada después de la canción actual`
                : `**[${track.title}](${track.uri})**`
        )
        .addFields(requesterField, { name: '⏱️ Duración', value: formatTrackDuration(track.length), inline: true });
}
