import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('pause')
        .setDescription('Pauses playback'),
    
    async execute(interaction, kazagumo) {
        const player = kazagumo.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply('❌ No song is currently playing!');
        }

        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel || player.voiceId !== voiceChannel.id) {
            return interaction.reply('❌ You must be in the same voice channel as the bot!');
        }

        if (player.paused) {
            return interaction.reply('❌ Playback is already paused!');
        }

        await player.pause(true);

        const embed = new EmbedBuilder()
            .setColor(0xFEE75C)
            .setTitle('⏸️ Playback paused')
            .setDescription(`Paused: **${player.queue.current?.title ?? 'Unknown'}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
