import { SlashCommandBuilder } from 'discord.js';
import { searchAndEnqueue } from '../src/services/playback.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('reproducir')
        .setDescription('Reproduce una canción o la agrega a la cola')
        .addStringOption(option =>
            option.setName('consulta')
                .setDescription('Nombre o URL de la canción')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        const query = interaction.options.getString('consulta', true);
        const guildId = interaction.guild.id;

        logger.info('Comando reproducir', { guildId, user: interaction.user.tag, query });

        return searchAndEnqueue(interaction, kazagumo, query, { position: 'end' });
    }
};
