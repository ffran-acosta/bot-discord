import logger from '../utils/logger.js';

export default function registerShoukakuEvents(shoukaku) {
    shoukaku.on('ready', (name) => {
        logger.info(`Lavalink ${name}: conectado`);
    });

    shoukaku.on('error', (name, error) => {
        logger.error(`Lavalink ${name}: error`, { error: error?.message });
    });

    shoukaku.on('close', (name, code, reason) => {
        logger.warn(`Lavalink ${name}: cerrado`, { code, reason: reason || 'sin motivo' });
    });

    shoukaku.on('disconnect', (name, players, moved) => {
        logger.warn(`Lavalink ${name}: desconectado`, { players: players.length, moved });
        if (players?.length > 0) {
            players.forEach(player => {
                try {
                    if (player && !moved) {
                        player.destroy().catch(err => {
                            logger.error(`Error destruyendo player tras desconexión`, { guildId: player.guildId, error: err.message });
                        });
                    }
                } catch (err) {
                    logger.error('Error manejando player desconectado', { error: err.message });
                }
            });
        }
    });

    shoukaku.on('debug', (name, info) => {
        if (typeof info === 'string' && (
            info.includes('Connection') ||
            info.includes('Player') ||
            info.includes('Error') ||
            info.includes('404') ||
            info.includes('disconnect') ||
            info.includes('Voice') ||
            info.includes('Session') ||
            info.includes('Server Update') ||
            info.includes('State Update')
        )) {
            logger.debug(`[${name}] ${info}`);
        }
    });
}
