import { cancelEmptyChannelDisconnect } from '../services/timers.js';

export default function registerPlayerDestroyEvent(kazagumo) {
    kazagumo.on('playerDestroy', (player) => {
        console.log(`Player destroyed for guild ${player.guildId}`);
        cancelEmptyChannelDisconnect(player.guildId);
    });
}
