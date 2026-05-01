import logger from '../utils/logger.js';
import { DISCONNECT_TIMEOUT_MS, EMPTY_CHANNEL_TIMEOUT_MS } from '../config/constants.js';

const inactiveTimers = new Map();
const emptyChannelTimers = new Map();

export function scheduleDisconnect(player, kazagumo) {
    const guildId = player.guildId;
    if (inactiveTimers.has(guildId)) return;

    const timer = setTimeout(async () => {
        inactiveTimers.delete(guildId);
        try {
            const p = kazagumo.players.get(guildId);
            if (p && !p.playing && p.queue.length === 0) await p.destroy();
        } catch (err) {
            logger.error('Error destruyendo player inactivo', { guildId, error: err.message });
        }
    }, DISCONNECT_TIMEOUT_MS);

    inactiveTimers.set(guildId, timer);
}

export function cancelDisconnect(guildId) {
    const timer = inactiveTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        inactiveTimers.delete(guildId);
    }
}

export function scheduleEmptyChannelDisconnect(guildId, kazagumo) {
    if (emptyChannelTimers.has(guildId)) return;
    logger.info('Canal de voz vacío, desconexión programada', { guildId });

    const timer = setTimeout(async () => {
        emptyChannelTimers.delete(guildId);
        const player = kazagumo.players.get(guildId);
        if (!player) return;
        try {
            player.queue.clear();
            await player.destroy();
            logger.info('Desconectado de canal vacío tras timeout', { guildId });
        } catch (err) {
            logger.error('Error desconectando de canal vacío', { guildId, error: err.message });
        }
    }, EMPTY_CHANNEL_TIMEOUT_MS);

    emptyChannelTimers.set(guildId, timer);
}

export function cancelEmptyChannelDisconnect(guildId) {
    const timer = emptyChannelTimers.get(guildId);
    if (timer) {
        clearTimeout(timer);
        emptyChannelTimers.delete(guildId);
        logger.debug('Timer de canal vacío cancelado', { guildId });
    }
}
