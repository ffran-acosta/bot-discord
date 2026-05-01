import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('shuffle')
        .setDescription('Shuffles the songs in the queue'),

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

        if (player.queue.length === 0) {
            return interaction.reply('❌ There are no songs in the queue to shuffle! (The current song keeps playing.)');
        }

        // Kazagumo 3.x KazagumoQueue has a shuffle() method
        // It shuffles the queue in place (not the current track)
        if (typeof player.queue.shuffle === 'function') {
            player.queue.shuffle();
        } else {
            // Manual Fisher-Yates shuffle as fallback
            const tracks = player.queue;
            for (let i = tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔀 Queue shuffled')
            .setDescription(`**${player.queue.length}** songs in the queue have been shuffled.`)
            .addFields(
                { name: '🎵 Now playing', value: player.queue.current?.title ?? 'Nothing', inline: false }
            )
            .setTimestamp();

        console.log(`🔀 Shuffle command | Guild: ${interaction.guild.id} | User: ${interaction.user.tag} | Queue: ${player.queue.length} tracks`);

        await interaction.reply({ embeds: [embed] });
    }
};
