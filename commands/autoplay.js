import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Enables or disables automatic playback of related songs')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Enable or disable autoplay')
                .setRequired(true)
                .addChoices(
                    { name: 'Enable', value: 'on' },
                    { name: 'Disable', value: 'off' }
                )),
    
    async execute(interaction, kazagumo) {
        const player = kazagumo.players.get(interaction.guild.id);

        if (!player) {
            return interaction.reply('❌ No music is currently playing! Use `/play` to start.');
        }

        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel || player.voiceId !== voiceChannel.id) {
            return interaction.reply('❌ You must be in the same voice channel as the bot!');
        }

        const mode = interaction.options.getString('mode');
        const isEnabled = mode === 'on';
        
        // Save autoplay state in the player
        player._autoplay = isEnabled;
        
        // Set autoplay context to current track when enabling
        if (isEnabled && player.queue.current) {
            player._autoplayContext = player.queue.current;
            console.log(`   └─ Autoplay context set to: ${player.queue.current.title}`);
        }

        const embed = new EmbedBuilder()
            .setColor(isEnabled ? 0x57F287 : 0xED4245)
            .setTitle(isEnabled ? '🔄 Autoplay enabled' : '⏹️ Autoplay disabled')
            .setDescription(
                isEnabled 
                    ? 'The bot will now automatically play related songs when the queue ends.\n\nUse `/play` to add songs manually or `/autoplay off` to disable.'
                    : 'The bot will no longer automatically play songs when the queue ends.'
            )
            .setTimestamp();

        console.log(`🔄 Autoplay ${isEnabled ? 'enabled' : 'disabled'} | Guild: ${interaction.guild.id} | User: ${interaction.user.tag}`);

        await interaction.reply({ embeds: [embed] });
    }
};
