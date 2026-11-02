import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../src/ui/colors.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';

export default {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Reanuda la reproducción'),

    async execute(interaction, kazagumo) {
        const guard = await requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        if (!player.paused) {
            return interaction.reply('❌ La reproducción no está pausada.');
        }

        await player.pause(false);

        const embed = new EmbedBuilder()
            .setColor(COLORS.success)
            .setTitle('▶️ Reanudado')
            .setDescription(`Sonando: **${player.queue.current?.title ?? '—'}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
