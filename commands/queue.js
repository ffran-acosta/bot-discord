import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('queue')
        .setDescription('Shows the playback queue'),
    
    async execute(interaction, kazagumo) {
        const player = kazagumo.players.get(interaction.guild.id);

        if (!player || !player.queue.current) {
            return interaction.reply('❌ No song in the queue!');
        }

        const queue = player.queue;
        const current = queue.current;
        const tracks = queue.slice(0, 10); // Show maximum 10 songs

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📋 Playback queue')
            .setDescription(`**Now playing:**\n[${current.title}](${current.uri})`)
            .addFields(
                { name: '⏱️ Duration', value: current.length > 0 ? formatTime(current.length) : 'Live', inline: true },
                { name: '👤 Requested by', value: `${current.requester}`, inline: true }
            )
            .setThumbnail(current.thumbnail || null);

        if (tracks.length > 0) {
            const queueList = tracks.map((track, index) => 
                `**${index + 1}.** [${track.title}](${track.uri}) - ${track.requester}`
            ).join('\n');
            
            embed.addFields({
                name: `📝 Upcoming songs (${queue.length} total)`,
                value: queueList.length > 1024 ? queueList.substring(0, 1021) + '...' : queueList
            });
        }

        embed.setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};

function formatTime(ms) {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
