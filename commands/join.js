import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { COLORS } from '../src/ui/colors.js';
import { requireVoiceChannel } from '../src/middleware/guards.js';
import { PlayerSetupError, resolveOrCreatePlayer } from '../src/utils/playerUtils.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder().setName('join').setDescription('Se une al canal de voz en el que estás'),

    async execute(interaction, kazagumo) {
        const voiceChannel = await requireVoiceChannel(interaction);
        if (!voiceChannel) return;

        try {
            await resolveOrCreatePlayer(kazagumo, interaction, voiceChannel);

            const embed = new EmbedBuilder()
                .setColor(COLORS.success)
                .setTitle('🔊 Conectado')
                .setDescription(`Me uní a **${voiceChannel.name}**.`)
                .setTimestamp();

            await interaction.reply({ embeds: [embed] });
        } catch (error) {
            logger.error('Error al unirse al canal de voz', { guildId: interaction.guild.id, error: error.message });
            const message =
                error instanceof PlayerSetupError
                    ? error.userMessage
                    : '❌ No pude unirme al canal de voz. Probá de nuevo.';
            await interaction.reply(message);
        }
    }
};
