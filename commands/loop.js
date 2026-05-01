import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Sets repeat mode for the music queue')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Repeat mode')
                .setRequired(true)
                .addChoices(
                    { name: 'Off', value: 'off' },
                    { name: 'Track', value: 'track' },
                    { name: 'Queue', value: 'queue' }
                )
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

        const mode = interaction.options.getString('mode', true);
        player._loopMode = mode;
        player.setLoop('none');

        const labels = { off: 'Off', track: 'Track', queue: 'Queue' };
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔁 Loop mode')
            .setDescription(`Set to **${labels[mode]}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
