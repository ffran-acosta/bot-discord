import { scheduleEmptyChannelDisconnect, cancelEmptyChannelDisconnect } from '../services/timers.js';
import logger from '../utils/logger.js';

export default function registerVoiceStateUpdateEvent(client, kazagumo) {
    client.on('voiceStateUpdate', async (oldState, newState) => {
        const guildId = oldState.guild.id;
        const player = kazagumo.players.get(guildId);

        if (newState.member?.id !== client.user?.id && player?.voiceId) {
            const channel = oldState.guild.channels.cache.get(player.voiceId);
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
            logger.warn('Bot desconectado manualmente del canal de voz', { guildId });
            await new Promise(resolve => setTimeout(resolve, 3000));

            const currentPlayer = kazagumo.players.get(guildId);
            if (!currentPlayer) return;

            const botMember = newState.guild.members.cache.get(client.user.id);
            if (botMember?.voice?.channel) {
                logger.info('Bot reconectado a canal de voz, no se destruye el player', { guildId });
                return;
            }

            try {
                await currentPlayer.destroy().catch(err => {
                    if (!err.message?.includes('already destroyed') && err.code !== 1) {
                        logger.error('Error destruyendo player tras desconexión manual', { guildId, error: err.message });
                    }
                });
            } catch (err) {
                if (!err.message?.includes('already destroyed') && err.code !== 1) {
                    logger.error('Error verificando estado del player', { guildId, error: err.message });
                }
            }
        }
    });
}
