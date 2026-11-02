import { ActionRowBuilder, ButtonBuilder, ButtonStyle, ComponentType, EmbedBuilder, SlashCommandBuilder } from 'discord.js';
import { formatTrackDuration } from '../src/utils/formatTime.js';
import { QUEUE_COLLECTOR_TIMEOUT_MS, QUEUE_PAGE_SIZE } from '../src/config/constants.js';
import { requirePlayer } from '../src/middleware/guards.js';
import { COLORS } from '../src/ui/colors.js';

/** Límite de Discord para el valor de un field de embed. */
const EMBED_FIELD_MAX = 1024;

/**
 * Une líneas completas sin pasar el límite del field (cortar a mitad rompe el markdown de los links).
 * @param {string[]} lines
 */
export function joinLinesWithinLimit(lines) {
    for (let count = lines.length; count > 0; count--) {
        const omitted = lines.length - count;
        const text = lines.slice(0, count).join('\n') + (omitted > 0 ? `\n…y ${omitted} más en esta página` : '');
        if (text.length <= EMBED_FIELD_MAX) return text;
    }
    return lines[0].slice(0, EMBED_FIELD_MAX);
}

/**
 * @param {import('kazagumo').KazagumoPlayer} player
 * @param {number} page
 */
function buildQueueEmbed(player, page) {
    const queue = player.queue;
    const current = queue.current;
    const totalUpcoming = queue.length;
    const maxPage = Math.max(0, Math.ceil(totalUpcoming / QUEUE_PAGE_SIZE) - 1);
    const safePage = Math.min(Math.max(0, page), maxPage);
    const start = safePage * QUEUE_PAGE_SIZE;
    const slice = queue.slice(start, start + QUEUE_PAGE_SIZE);

    const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .setTitle('📋 Cola de reproducción')
        .setDescription(
            `**En reproducción:**\n[${current.title}](${current.uri ?? '#'})\n` +
                `⏱️ ${formatTrackDuration(current.length)} · 👤 ${current.requester ?? '—'}`
        )
        .setThumbnail(current.thumbnail || null);

    if (slice.length > 0) {
        const lines = slice.map(
            (track, i) => `**${start + i + 1}.** [${track.title}](${track.uri ?? '#'}) · ${track.requester ?? '—'}`
        );
        embed.addFields({ name: `Siguientes (${totalUpcoming})`, value: joinLinesWithinLimit(lines) });
    } else {
        embed.addFields({ name: 'Siguientes', value: 'No hay más temas en cola.' });
    }

    embed.setFooter({ text: `Página ${safePage + 1}/${maxPage + 1} · ${totalUpcoming} en cola` });

    return { embed, maxPage, safePage };
}

/**
 * @param {number} page
 * @param {number} maxPage
 */
function buildQueueRows(page, maxPage) {
    return [
        new ActionRowBuilder().addComponents(
            new ButtonBuilder()
                .setCustomId('queue_prev')
                .setLabel('◀ Anterior')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page <= 0),
            new ButtonBuilder()
                .setCustomId('queue_next')
                .setLabel('Siguiente ▶')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(page >= maxPage)
        )
    ];
}

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Muestra la cola de reproducción (10 por página)'),

    async execute(interaction, kazagumo) {
        const player = await requirePlayer(interaction, kazagumo);
        if (!player) return;

        if (!player.queue.current) {
            return interaction.reply('❌ No hay música en reproducción.');
        }

        let page = 0;
        const first = buildQueueEmbed(player, page);
        page = first.safePage;

        await interaction.reply({
            embeds: [first.embed],
            components: buildQueueRows(page, first.maxPage)
        });

        const message = await interaction.fetchReply();

        const collector = message.createMessageComponentCollector({
            componentType: ComponentType.Button,
            filter: i =>
                i.message.id === message.id &&
                i.user.id === interaction.user.id &&
                (i.customId === 'queue_prev' || i.customId === 'queue_next'),
            time: QUEUE_COLLECTOR_TIMEOUT_MS
        });

        collector.on('collect', async i => {
            const p = kazagumo.players.get(interaction.guild.id);
            if (!p?.queue.current) {
                await i.update({ components: [] }).catch(() => {});
                collector.stop();
                return;
            }

            if (i.customId === 'queue_prev') page -= 1;
            else page += 1;

            const built = buildQueueEmbed(p, page);
            page = built.safePage;

            await i
                .update({
                    embeds: [built.embed],
                    components: buildQueueRows(page, built.maxPage)
                })
                .catch(() => {});
        });

        collector.on('end', async () => {
            try {
                await interaction.editReply({ components: [] });
            } catch {
                // ignorar
            }
        });
    }
};
