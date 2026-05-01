import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('parar')
        .setDescription('Detiene la reproducción, vacía la cola y desconecta al bot'),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        try {
            player.queue.clear();
            await player.destroy();
        } catch (err) {
            logger.error('Error deteniendo player', { guildId: interaction.guild.id, error: err.message });
        }

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⏹️ Reproducción detenida')
            .setDescription('Se vació la cola y el bot se desconectó del canal de voz.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
