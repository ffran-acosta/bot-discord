import { stopNowPlayingUpdates } from '../services/nowPlayingMessage.js';
import { cancelEmptyChannelDisconnect } from '../services/timers.js';

export default function registerPlayerDestroyEvent(kazagumo, client) {
    kazagumo.on('playerDestroy', (player) => {
        console.log(`Player destroyed for guild ${player.guildId}`);
        cancelEmptyChannelDisconnect(player.guildId);
        void stopNowPlayingUpdates(client, player.guildId);
    });
}
