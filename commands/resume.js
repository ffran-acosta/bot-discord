import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('resume')
        .setDescription('Resumes playback'),
    
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

        if (!player.paused) {
            return interaction.reply('❌ Playback is not paused!');
        }

        await player.pause(false);

        const embed = new EmbedBuilder()
            .setColor(0x57F287)
            .setTitle('▶️ Playback resumed')
            .setDescription(`Playing: **${player.queue.current?.title ?? 'Unknown'}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
