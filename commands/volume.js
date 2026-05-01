import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';

export default {
    data: new SlashCommandBuilder()
        .setName('volume')
        .setDescription('Adjusts volume (0-100)')
        .addIntegerOption(option =>
            option.setName('level')
                .setDescription('Volume level between 0 and 100')
                .setRequired(true)
                .setMinValue(0)
                .setMaxValue(100)
        ),
    
    async execute(interaction, kazagumo) {
        await interaction.deferReply();
        
        const player = kazagumo.players.get(interaction.guild.id);

        if (!player) {
            return interaction.editReply('❌ No song is currently playing!');
        }

        // Verify player has a current track
        if (!player.queue.current) {
            return interaction.editReply('❌ No song is currently playing!');
        }

        const member = interaction.member;
        const voiceChannel = member.voice.channel;

        if (!voiceChannel || player.voiceId !== voiceChannel.id) {
            return interaction.editReply('❌ You must be in the same voice channel as the bot!');
        }

        // Verify bot is actually in voice channel
        const guild = interaction.guild;
        const botMember = guild.members.cache.get(interaction.client.user.id);
        const botVoiceChannel = botMember?.voice?.channel;
        
        if (!botVoiceChannel || botVoiceChannel.id !== voiceChannel.id) {
            return interaction.editReply('❌ Bot is not connected to the voice channel. Please use `/play` to reconnect!');
        }

        // Try multiple parameter names to support different command registrations
        // 'level' (new), 'volume' (old English), 'volumen' (Spanish)
        let volume = interaction.options.getInteger('level');
        if (volume === null) {
            volume = interaction.options.getInteger('volume');
        }
        if (volume === null) {
            volume = interaction.options.getInteger('volumen');
        }
        
        console.log(`🔊 Volume command | Guild: ${interaction.guild.id} | User: ${interaction.user.tag} | Level: ${volume}%`);

        if (volume === null || volume === undefined) {
            return interaction.editReply('❌ Volume value is required! Please specify a level between 0 and 100.');
        }
        
        if (volume < 0 || volume > 100) {
            return interaction.editReply('❌ Volume must be between 0 and 100!');
        }
        
        try {
            // Verify player is actually connected and ready
            if (!player.voiceId) {
                return interaction.editReply('❌ Player is not connected to a voice channel!');
            }
            
            // Kazagumo's setVolume accepts 0-100 directly
            await player.setVolume(volume);

            console.log(`✅ Volume set to ${volume}% | Guild: ${interaction.guild.id}`);

            // Ensure volume is a valid number for display
            const displayVolume = volume !== null && volume !== undefined ? volume : 'unknown';

            const embed = new EmbedBuilder()
                .setColor(0x5865F2)
                .setTitle('🔊 Volume adjusted')
                .setDescription(`Volume set to: **${displayVolume}%**`)
                .setTimestamp();

            await interaction.editReply({ embeds: [embed] });
        } catch (error) {
            console.error('Error setting volume:', error);
            await interaction.editReply('❌ There was an error adjusting the volume. Please try again!');
        }
    }
};
