import { SlashCommandBuilder } from 'discord.js';
import { searchAndEnqueue } from '../src/services/playback.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('playnext')
        .setDescription('Busca e inserta una canción después de la actual (frente de la cola)')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Nombre o URL de la canción')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        const query = interaction.options.getString('song') || interaction.options.getString('cancion');
        const guildId = interaction.guild.id;

        logger.info('Comando playnext', { guildId, user: interaction.user.tag, query });

        return searchAndEnqueue(interaction, kazagumo, query, { position: 'front' });
    }
};
