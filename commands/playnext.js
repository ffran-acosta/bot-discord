import { SlashCommandBuilder } from 'discord.js';
import { searchAndEnqueue } from '../src/services/playback.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('siguiente-tema')
        .setDescription('Inserta una canción después de la actual (frente de la cola)')
        .addStringOption(option =>
            option.setName('consulta')
                .setDescription('Nombre o URL de la canción')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        const query = interaction.options.getString('consulta', true);
        const guildId = interaction.guild.id;

        logger.info('Comando siguiente-tema', { guildId, user: interaction.user.tag, query });

        return searchAndEnqueue(interaction, kazagumo, query, { position: 'front' });
    }
};
