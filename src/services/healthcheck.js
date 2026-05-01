import express from 'express';

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

        const code = status === 'ok' ? 200 : status === 'degraded' ? 200 : 503;
        res.status(code).json({
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

    return app.listen(port, () => {
        console.log(`🩺 Healthcheck HTTP listening on :${port}`);
    });
}
