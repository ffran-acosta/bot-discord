import { stopNowPlayingUpdates } from '../services/nowPlayingMessage.js';
import { cancelDisconnect, cancelEmptyChannelDisconnect } from '../services/timers.js';
import { clearPlayerState } from '../services/playerState.js';
import logger from '../utils/logger.js';

export default function registerPlayerDestroyEvent(kazagumo, client) {
    kazagumo.on('playerDestroy', (player) => {
        const guildId = player.guildId;
        logger.info('Player destruido', { guildId });
        cancelEmptyChannelDisconnect(guildId);
        cancelDisconnect(guildId);
        clearPlayerState(guildId);
        void stopNowPlayingUpdates(client, guildId);
    });
}
