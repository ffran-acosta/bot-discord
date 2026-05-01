import {
    ActionRowBuilder,
    ButtonBuilder,
    ButtonStyle,
    ComponentType,
    EmbedBuilder,
    SlashCommandBuilder
} from 'discord.js';
import { formatTime } from '../src/utils/formatTime.js';
import { QUEUE_COLLECTOR_TIMEOUT_MS, QUEUE_PAGE_SIZE } from '../src/config/constants.js';

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
        .setColor(0x5865F2)
        .setTitle('📋 Cola de reproducción')
        .setDescription(
            `**En reproducción:**\n[${current.title}](${current.uri ?? '#'})\n` +
                `⏱️ ${current.length > 0 ? formatTime(current.length) : 'Live'} · 👤 ${current.requester ?? '—'}`
        )
        .setThumbnail(current.thumbnail || null);

    if (slice.length > 0) {
        const lines = slice.map(
            (track, i) =>
                `**${start + i + 1}.** [${track.title}](${track.uri ?? '#'}) · ${track.requester ?? '—'}`
        );
        let block = lines.join('\n');
        if (block.length > 4096) block = `${block.slice(0, 4090)}…`;
        embed.addFields({ name: `Siguientes (${totalUpcoming})`, value: block });
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
        const player = kazagumo.players.get(interaction.guild.id);

        if (!player || !player.queue.current) {
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
