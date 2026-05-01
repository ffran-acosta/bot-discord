import express from 'express';
import logger from '../utils/logger.js';

function resolveStatus(client, kazagumo) {
    if (!client.isReady()) return 'down';
    const nodes = [...kazagumo.shoukaku.nodes.values()];
    const connected = nodes.filter(node => node.state === 1).length;
    if (nodes.length > 0 && connected === 0) return 'degraded';
    return 'ok';
}

export function startHealthcheckServer(client, kazagumo, port = Number(process.env.HEALTHCHECK_PORT || 3000)) {
    const app = express();

    app.get('/ping', (_req, res) => {
        res.status(200).send('pong');
    });

    app.get('/health', (_req, res) => {
        const status = resolveStatus(client, kazagumo);
        const nodes = [...kazagumo.shoukaku.nodes.values()];
        const connectedNodes = nodes.filter(node => node.state === 1).length;

        const httpCode = status === 'ok' || status === 'degraded' ? 200 : 503;
        res.status(httpCode).json({
            status,
            uptimeMs: Math.floor(process.uptime() * 1000),
            guilds: client.guilds.cache.size,
            players: kazagumo.players.size,
            lavalink: {
                connected: connectedNodes,
                total: nodes.length
            }
        });
    });

    const server = app.listen(port, () => {
        logger.info(`Healthcheck HTTP escuchando en :${port}`);
    });

    server.on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            logger.error(`Healthcheck: el puerto ${port} está en uso`, { error: err.message });
        } else {
            logger.error('Healthcheck: error del servidor HTTP', { error: err.message, code: err.code });
        }
    });

    return server;
}
