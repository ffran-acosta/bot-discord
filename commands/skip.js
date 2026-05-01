import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('skip')
        .setDescription('Skips to the next song'),

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

        if (!player.queue.current) {
            return interaction.reply('❌ No song is currently playing!');
        }

        const currentTrack = player.queue.current;
        const nextTrack = player.queue[0] ?? null;

        console.log(`⏭️ Skip | Guild: ${interaction.guild.id} | Skipping: ${currentTrack.title} | Next: ${nextTrack?.title ?? 'nothing'}`);

        await player.skip();

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('⏭️ Song skipped')
            .setDescription(`Skipped: **${currentTrack.title}**`)
            .setTimestamp();

        if (nextTrack) {
            embed.addFields({ name: '🎵 Next up', value: `**${nextTrack.title}**`, inline: false });
        } else if (player._autoplay) {
            embed.addFields({ name: '🔄 Autoplay', value: 'Finding a related song...', inline: false });
        } else {
            embed.setDescription(`Skipped: **${currentTrack.title}**\n\n❌ No more songs in queue.`);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
