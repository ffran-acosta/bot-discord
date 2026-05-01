import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('volumen')
        .setDescription('Ajusta el volumen (0-100)')
        .addIntegerOption(option =>
            option.setName('nivel')
                .setDescription('Nivel de volumen entre 0 y 100')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        const volume = interaction.options.getInteger('nivel', true);

        try {
            await player.setVolume(volume);

            logger.info(`Volumen ajustado a ${volume}%`, { guildId: interaction.guild.id });

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔊 Volumen')
                .setDescription(`Volumen en **${volume}%**`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error ajustando volumen', { guildId: interaction.guild.id, error: error.message });
            await interaction.reply('❌ No se pudo cambiar el volumen. Probá de nuevo.');
        }
    }
};
