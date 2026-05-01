import { ActionRowBuilder, ButtonBuilder, ButtonStyle, EmbedBuilder } from 'discord.js';
import { formatTime } from '../utils/formatTime.js';
import { PREVIOUS_RESTART_THRESHOLD_MS, PROGRESS_BAR_WIDTH } from '../config/constants.js';

/**
 * @param {number} positionMs
 * @param {number} durationMs
 * @param {number} [width=PROGRESS_BAR_WIDTH]
 */
export function buildProgressBar(positionMs, durationMs, width = PROGRESS_BAR_WIDTH) {
    if (!durationMs || durationMs <= 0) {
        return `\`${'░'.repeat(width)}\` · EN VIVO`;
    }
    const p = Math.min(1, Math.max(0, positionMs / durationMs));
    const filled = Math.round(p * width);
    const bar = '█'.repeat(filled) + '░'.repeat(width - filled);
    return `\`${bar}\` · ${formatTime(positionMs)} / ${formatTime(durationMs)}`;
}

/**
 * @param {import('kazagumo').KazagumoPlayer} player
 */
export function buildNowPlayingEmbed(player) {
    const current = player.queue.current;
    const embed = new EmbedBuilder().setColor(0x5865F2).setTimestamp();

    if (!current) {
        if (player.queue.length > 0) {
            const next = player.queue[0];
            return embed
                .setTitle('🎵 Reproductor')
                .setDescription(`Siguiente: **${next.title}**`)
                .addFields({ name: 'Cola', value: `${player.queue.length} tema(s)`, inline: true });
        }
        return embed
            .setTitle('🎵 Reproductor')
            .setDescription('No hay nada en reproducción.')
            .addFields({ name: 'Cola', value: '0', inline: true });
    }

    const position = player.position ?? 0;
    const bar = buildProgressBar(position, current.length ?? 0);
    const req = current.requester ? `${current.requester}` : '—';

    return embed
        .setTitle(player.paused ? '⏸️ Pausado' : '▶️ Reproduciendo')
        .setDescription(`**[${current.title}](${current.uri ?? '#'})**`)
        .addFields(
            { name: 'Progreso', value: bar, inline: false },
            { name: 'Pedido por', value: req, inline: true },
            { name: 'Cola', value: `${player.queue.length} pendiente(s)`, inline: true },
            { name: 'Volumen', value: `${player.volume ?? 100}%`, inline: true }
        )
        .setThumbnail(current.thumbnail || null);
}

/**
 * @param {import('kazagumo').KazagumoPlayer} player
 */
export function buildPlayerButtons(player) {
    const guildId = player.guildId;
    const hasTrack = Boolean(player.queue.current);
    const current = player.queue.current;
    const pos = player.position ?? 0;
    const prevLen = player.queue.previous?.length ?? 0;
    const canPrevious =
        hasTrack &&
        (prevLen > 0 ||
            (current?.isSeekable &&
                current?.length > 0 &&
                (pos >= PREVIOUS_RESTART_THRESHOLD_MS || player.paused)));
    const transportRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`player:previous:${guildId}`)
            .setLabel('⏮ Anterior')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!canPrevious),
        new ButtonBuilder()
            .setCustomId(`player:togglepause:${guildId}`)
            .setLabel(player.paused ? '▶ Reanudar' : '⏸ Pausar')
            .setStyle(player.paused ? ButtonStyle.Success : ButtonStyle.Primary)
            .setDisabled(!hasTrack),
        new ButtonBuilder()
            .setCustomId(`player:skip:${guildId}`)
            .setLabel('⏭ Siguiente')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasTrack),
        new ButtonBuilder()
            .setCustomId(`player:stop:${guildId}`)
            .setLabel('Detener')
            .setStyle(ButtonStyle.Danger)
    );
    const extrasRow = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
            .setCustomId(`player:clearqueue:${guildId}`)
            .setLabel('🗑 Vaciar cola')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(!hasTrack)
    );
    return [transportRow, extrasRow];
}
