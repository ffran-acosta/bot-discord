import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Clears the music queue (current track keeps playing)'),

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

        const removed = player.queue.length;
        player.queue.clear();

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🗑️ Queue cleared')
            .setDescription(removed > 0 ? `Removed **${removed}** track(s) from the queue.` : 'The queue was already empty.')
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
