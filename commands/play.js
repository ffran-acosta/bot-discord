import { SlashCommandBuilder } from 'discord.js';
import { searchAndEnqueue } from '../src/services/playback.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce una canción o la agrega a la cola')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Nombre o URL de la canción')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        const query = interaction.options.getString('song', true);
        const guildId = interaction.guild.id;

        logger.info('Comando play', { guildId, user: interaction.user.tag, query });

        return searchAndEnqueue(interaction, kazagumo, query, { position: 'end' });
    }
};
