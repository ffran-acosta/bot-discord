import { config } from 'dotenv';

config();

export async function fetchLavalinkNodes(maxNodes = 20) {
    const apis = [
        'https://lavalink-list.ajieblogs.eu.org/SSL',
        'https://lavalink-list.ajieblogs.eu.org/all',
    ];
    for (const apiUrl of apis) {
        try {
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 8000);
            const response = await fetch(apiUrl, { signal: controller.signal });
            clearTimeout(timeout);
            if (!response.ok) continue;
            const list = await response.json();
            const v4Nodes = list
                .filter(n =>
                    (n.version === 'v4' || String(n.version).startsWith('4')) &&
                    !n.host.includes('-v3.') &&
                    !n.host.startsWith('lavalink-v3') &&
                    !n.host.includes('jirayu.net') &&
                    (n.secure || n.port === 443)
                )
                .slice(0, maxNodes)
                .map(n => ({
                    name: n.identifier || n.name || n.host,
                    url: `${n.host}:${n.port}`,
                    auth: n.password,
                    secure: Boolean(n.secure || n.port === 443)
                }));
            if (v4Nodes.length > 0) {
                console.log(`📡 API (${apiUrl}) returned ${v4Nodes.length} v4 SSL nodes`);
                return v4Nodes;
            }
        } catch (error) {
            console.warn(`⚠️ Could not fetch nodes from ${apiUrl}: ${error.message}`);
        }
    }
    return [];
}

const lavalinkUrl = process.env.LAVALINK_URL || 'localhost:2333';
const lavalinkPort = parseInt(lavalinkUrl.split(':')[1]) || 2333;
const isSecure = process.env.LAVALINK_SECURE === 'true' || lavalinkPort === 443;

export const primaryNode = {
    name: 'primary',
    url: lavalinkUrl,
    auth: process.env.LAVALINK_PASSWORD || 'youshallnotpass',
    secure: isSecure
};

export const fallbackNodes = [
    { name: 'triniumhost-v4',    url: 'lavalink-v4.triniumhost.com:443',      auth: 'free',                         secure: true },
    { name: 'serenetia-v4',      url: 'lavalinkv4.serenetia.com:443',         auth: 'https://seretia.link/discord', secure: true },
    { name: 'lavalinkv4-2',      url: 'lavalinkv4-2.serenetia.com:443',       auth: 'https://seretia.link/discord', secure: true },
];
