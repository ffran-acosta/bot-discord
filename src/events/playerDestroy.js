import { stopNowPlayingUpdates } from '../services/nowPlayingMessage.js';
import { cancelEmptyChannelDisconnect } from '../services/timers.js';
import logger from '../utils/logger.js';

export default function registerPlayerDestroyEvent(kazagumo, client) {
    kazagumo.on('playerDestroy', (player) => {
        logger.info('Player destruido', { guildId: player.guildId });
        cancelEmptyChannelDisconnect(player.guildId);
        void stopNowPlayingUpdates(client, player.guildId);
    });
}
