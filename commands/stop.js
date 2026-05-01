import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stop')
        .setDescription('Stops playback and clears queue'),
    
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

        try {
            player.queue.clear();
            await player.destroy();
        } catch (err) {
            console.error('Error stopping player:', err);
        }

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('⏹️ Playback stopped')
            .setDescription('The queue has been cleared and the bot has disconnected.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
