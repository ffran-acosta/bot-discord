import { SlashCommandBuilder } from 'discord.js';
import { syncNowPlayingPanel } from '../src/services/nowPlayingMessage.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra el panel de reproducción con controles en este canal'),

    async execute(interaction, kazagumo) {
        await interaction.deferReply({ flags: 64 });

        const player = kazagumo.players.get(interaction.guild.id);
        if (!player) {
            return interaction.editReply('❌ No hay música en este servidor.');
        }

        const member = interaction.member;
        const voiceChannel = member.voice.channel;
        if (!voiceChannel || player.voiceId !== voiceChannel.id) {
            return interaction.editReply('❌ Tenés que estar en el mismo canal de voz que el bot.');
        }

        player.setTextChannel(interaction.channel.id);
        await syncNowPlayingPanel(interaction.client, kazagumo, player);

        return interaction.editReply('Panel de reproducción');
    }
};
