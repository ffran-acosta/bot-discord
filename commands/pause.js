import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../src/ui/colors.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pausa la reproducción'),

    async execute(interaction, kazagumo) {
        const guard = await requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        if (player.paused) {
            return interaction.reply('❌ La reproducción ya está pausada.');
        }

        await player.pause(true);

        const embed = new EmbedBuilder()
            .setColor(COLORS.warning)
            .setTitle('⏸️ Pausado')
            .setDescription(`Pausado: **${player.queue.current?.title ?? '—'}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
