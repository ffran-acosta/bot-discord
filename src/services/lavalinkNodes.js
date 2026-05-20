import {
    LAVALINK_RESTORE_POLL_MS,
    LAVALINK_RESTORE_WAIT_MS,
    LAVALINK_PLAY_WAIT_MS
} from '../config/constants.js';

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 */
export function getConnectedLavalinkNodes(kazagumo) {
    return [...kazagumo.shoukaku.nodes.values()].filter(n => n.state === 1);
}

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {number} [timeoutMs]
 */
export async function waitForConnectedLavalinkNodes(kazagumo, timeoutMs = LAVALINK_RESTORE_WAIT_MS) {
    const deadline = Date.now() + timeoutMs;
    while (Date.now() < deadline) {
        const nodes = getConnectedLavalinkNodes(kazagumo);
        if (nodes.length > 0) return nodes;
        await new Promise(r => setTimeout(r, LAVALINK_RESTORE_POLL_MS));
    }
    return [];
}

/** @param {import('kazagumo').Kazagumo} kazagumo */
export async function waitForPlayLavalinkNodes(kazagumo) {
    return waitForConnectedLavalinkNodes(kazagumo, LAVALINK_PLAY_WAIT_MS);
}
