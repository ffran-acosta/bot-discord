import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatTime } from '../src/utils/formatTime.js';

function parseSeekInput(raw) {
    const s = raw.trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) {
        return parseInt(s, 10) * 1000;
    }
    const parts = s.split(':').map(p => p.trim());
    if (parts.some(p => !/^\d+$/.test(p))) return null;
    const nums = parts.map(p => parseInt(p, 10));
    if (nums.length === 2) {
        return (nums[0] * 60 + nums[1]) * 1000;
    }
    if (nums.length === 3) {
        return (nums[0] * 3600 + nums[1] * 60 + nums[2]) * 1000;
    }
    return null;
}

export default {
    data: new SlashCommandBuilder()
        .setName('seek')
        .setDescription('Seeks to a position in the current track (mm:ss or seconds)')
        .addStringOption(option =>
            option
                .setName('time')
                .setDescription('Time as seconds (e.g. 90) or mm:ss (e.g. 1:30)')
                .setRequired(true)
        ),

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

        const current = player.queue.current;
        if (!current) {
            return interaction.reply('❌ No song is currently playing!');
        }

        if (!current.length) {
            return interaction.reply('❌ Cannot seek in live streams or tracks without a fixed duration.');
        }

        if (!current.isSeekable) {
            return interaction.reply('❌ This track cannot be seeked.');
        }

        const raw = interaction.options.getString('time', true);
        const positionMs = parseSeekInput(raw);
        if (positionMs === null || positionMs < 0) {
            return interaction.reply('❌ Invalid time. Use seconds (e.g. `90`) or `mm:ss` / `h:mm:ss`.');
        }

        const duration = current.length;
        if (positionMs > duration) {
            return interaction.reply(`❌ Seek position exceeds track duration (${formatTime(duration)}).`);
        }

        try {
            await player.seek(positionMs);
        } catch (err) {
            return interaction.reply(`❌ Seek failed: ${err.message || 'unknown error'}`);
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('⏩ Seek')
            .setDescription(`Position: **${formatTime(positionMs)}** / ${formatTime(duration)}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
