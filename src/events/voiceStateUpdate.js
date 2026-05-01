import { scheduleEmptyChannelDisconnect, cancelEmptyChannelDisconnect } from '../services/timers.js';

export default function registerVoiceStateUpdateEvent(client, kazagumo) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guildId = oldState.guild.id;
        const player = kazagumo.players.get(guildId);

        if (newState.member?.id !== client.user?.id && player?.voiceId) {
            const botChannelId = player.voiceId;
            const channel = oldState.guild.channels.cache.get(botChannelId);
            if (!channel) return;

            const humanCount = channel.members.filter(m => !m.user.bot).size;

            if (humanCount === 0) {
                scheduleEmptyChannelDisconnect(guildId, kazagumo);
            } else {
                cancelEmptyChannelDisconnect(guildId);
            }
            return;
        }

        if (newState.member?.id !== client.user?.id) return;

        if (oldState.channelId && !newState.channelId && player) {
            console.log(`⚠️ Bot was manually disconnected from voice channel in guild ${guildId}`);
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentPlayer = kazagumo.players.get(guildId);
            if (!currentPlayer) return;

            const guild = newState.guild;
            const botMember = guild.members.cache.get(client.user.id);
            if (botMember?.voice?.channel) {
                console.log(`Bot reconnected to channel ${botMember.voice.channel.id}, not destroying player`);
                return;
            }

            try {
                if (currentPlayer.voiceId && currentPlayer.guildId) {
                    await currentPlayer.destroy().catch(err => {
                        if (!err.message?.includes('already destroyed') && err.code !== 1) {
                            console.error(`Error destroying player after manual disconnect:`, err);
                        }
                    });
                }
            } catch (err) {
                if (!err.message?.includes('already destroyed') && err.code !== 1) {
                    console.error(`Error checking player state:`, err);
                }
            }
        }
    });
}
