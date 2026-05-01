import logger from '../utils/logger.js';

export default function registerPlayerExceptionEvent(kazagumo) {
    kazagumo.on('playerException', async (player, error) => {
        const status = error.status || error.response?.status;
        logger.error('Excepción en player', {
            guildId: player.guildId,
            error: error.message,
            status
        });

        if (status >= 500 && status < 600) {
            logger.warn(`Error de servidor Lavalink (${status}) en guild ${player.guildId}`);
        } else if (status === 404 || error.message?.includes('404')) {
            logger.warn(`Error 404 en guild ${player.guildId}, el player puede necesitar reconexión`);
        }
    });
}
