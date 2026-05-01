const startedAt = Date.now();
let songsPlayed = 0;

export function incrementSongsPlayed(amount = 1) {
    songsPlayed += Math.max(0, amount);
}

/**
 * @param {import('discord.js').Client} client
 * @param {import('kazagumo').Kazagumo} kazagumo
 */
export function getBotStats(client, kazagumo) {
    const uptimeMs = Date.now() - startedAt;
    const mem = process.memoryUsage();
    const nodes = [...kazagumo.shoukaku.nodes.values()];
    const lavalinkConnected = nodes.filter(n => n.state === 1).length;

    return {
        uptimeMs,
        guilds: client.guilds.cache.size,
        songsPlayed,
        lavalinkTotal: nodes.length,
        lavalinkConnected,
        rssBytes: mem.rss,
        heapUsedBytes: mem.heapUsed,
        heapTotalBytes: mem.heapTotal
    };
}

export function formatUptime(ms) {
    const s = Math.floor(ms / 1000);
    const d = Math.floor(s / 86400);
    const h = Math.floor((s % 86400) / 3600);
    const m = Math.floor((s % 3600) / 60);
    const sec = s % 60;
    if (d > 0) return `${d}d ${h}h ${m}m`;
    if (h > 0) return `${h}h ${m}m ${sec}s`;
    if (m > 0) return `${m}m ${sec}s`;
    return `${sec}s`;
}

export function formatBytes(n) {
    if (n < 1024) return `${n} B`;
    const kb = n / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KiB`;
    const mb = kb / 1024;
    if (mb < 1024) return `${mb.toFixed(1)} MiB`;
    return `${(mb / 1024).toFixed(2)} GiB`;
}
