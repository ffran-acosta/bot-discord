import logger from '../utils/logger.js';
import { buildNodeOptions, nodeUrlKey } from '../config/lavalink.js';

const HOUR_MS = 60 * 60 * 1000;
const EMERGENCY_COOLDOWN_MS = 5 * 60 * 1000;
const EMERGENCY_DEBOUNCE_MS = 2500;
const WATCHDOG_MS = 5 * 60 * 1000;
const FLAP_WINDOW_MS = 90 * 1000;
const FLAP_CLOSES_THRESHOLD = 5;

/**
 * @param {import('shoukaku').Shoukaku} shoukaku
 * @param {string} preferred
 */
function uniqueNodeName(shoukaku, preferred) {
    const base = String(preferred || 'node').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 40) || 'node';
    let name = base;
    let i = 0;
    while (shoukaku.nodes.has(name)) {
        name = `${base}-${++i}`;
    }
    return name;
}

/**
 * Refresh horario de la lista de nodos, emergencia si no queda ninguno conectado,
 * y eliminación de nodos que entran en flapping (reconexión en bucle).
 *
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('shoukaku').NodeOption[]} seededNodes Nodos usados al crear Kazagumo
 */
export function startLavalinkPoolMaintenance(kazagumo, seededNodes) {
    const shoukaku = kazagumo.shoukaku;

    /** @type {Set<string>} */
    const urlsWithNode = new Set(seededNodes.map(n => nodeUrlKey(n.url)));
    /** @type {Map<string, string>} */
    const nameToUrl = new Map(seededNodes.map(n => [n.name, nodeUrlKey(n.url)]));
    /** @type {Map<string, number[]>} */
    const closeHistory = new Map();

    let lastEmergencyAt = 0;
    let refreshing = false;
    /** @type {ReturnType<typeof setTimeout> | null} */
    let emergencyTimer = null;

    function connectedCount() {
        return [...shoukaku.nodes.values()].filter(n => n.state === 1).length;
    }

    /**
     * @param {'hourly' | 'emergency' | 'watchdog' | 'play'} reason
     */
    async function ingestNewNodes(reason) {
        if (refreshing) return;
        refreshing = true;
        try {
            const candidates = await buildNodeOptions();
            let added = 0;
            for (const opt of candidates) {
                const key = nodeUrlKey(opt.url);
                if (urlsWithNode.has(key)) continue;

                const name = uniqueNodeName(shoukaku, opt.name);
                shoukaku.addNode({ ...opt, name });
                urlsWithNode.add(key);
                nameToUrl.set(name, key);
                added++;
                logger.info(`Lavalink pool [${reason}]: agregado ${name} (${opt.url})`);
            }
            if (added === 0) {
                logger.debug(`Lavalink pool [${reason}]: sin URLs nuevas`);
            }
            if (reason === 'emergency' || reason === 'watchdog' || reason === 'play') {
                lastEmergencyAt = Date.now();
            }
        } catch (err) {
            logger.warn(`Lavalink pool [${reason}] falló`, { error: err.message });
        } finally {
            refreshing = false;
        }
    }

    /**
     * Si no hay nodos conectados, vacía el pool y vuelve a sembrar desde buildNodeOptions.
     * Corrige el caso en que urlsWithNode bloquea re-agregar URLs tras días sin conexión.
     *
     * @param {'emergency' | 'watchdog' | 'play'} reason
     */
    async function fullReseed(reason) {
        if (refreshing) return;
        refreshing = true;
        try {
            const candidates = await buildNodeOptions();
            const before = shoukaku.nodes.size;

            for (const name of [...shoukaku.nodes.keys()]) {
                try {
                    shoukaku.removeNode(name, reason);
                } catch (err) {
                    logger.warn(`removeNode(${name}) en reseed falló`, { error: err.message });
                }
            }

            urlsWithNode.clear();
            nameToUrl.clear();
            closeHistory.clear();

            let added = 0;
            for (const opt of candidates) {
                const key = nodeUrlKey(opt.url);
                const name = uniqueNodeName(shoukaku, opt.name);
                shoukaku.addNode({ ...opt, name });
                urlsWithNode.add(key);
                nameToUrl.set(name, key);
                added++;
            }

            logger.warn(`Lavalink pool [${reason}]: reseed completo (${before} → ${added} nodos)`);
            lastEmergencyAt = Date.now();
        } catch (err) {
            logger.warn(`Lavalink pool [${reason}] reseed falló`, { error: err.message });
        } finally {
            refreshing = false;
        }
    }

    /**
     * @param {'emergency' | 'watchdog' | 'play'} reason
     */
    async function recoverPool(reason) {
        if (connectedCount() > 0) return;

        const now = Date.now();
        if (reason !== 'play' && lastEmergencyAt > 0 && now - lastEmergencyAt < EMERGENCY_COOLDOWN_MS) {
            return;
        }

        const total = shoukaku.nodes.size;
        logger.warn(`Lavalink pool [${reason}]: sin nodos conectados (total=${total}), reseed`);
        await fullReseed(reason);
    }

    async function maybeEmergencyRefresh() {
        if (connectedCount() > 0) return;
        await recoverPool('emergency');
    }

    shoukaku.on('ready', (name) => {
        closeHistory.delete(name);
    });

    shoukaku.on('close', (name, code, reason) => {
        if (name !== 'primary') {
            const now = Date.now();
            const cutoff = now - FLAP_WINDOW_MS;
            const list = (closeHistory.get(name) || []).filter(t => t > cutoff);
            list.push(now);
            closeHistory.set(name, list);

            if (list.length >= FLAP_CLOSES_THRESHOLD) {
                closeHistory.delete(name);
                const urlKeyResolved = nameToUrl.get(name);
                logger.warn(`Lavalink ${name}: flapping (${list.length} cierres en ${FLAP_WINDOW_MS / 1000}s), removiendo nodo`, { code, reason: reason || '' });
                try {
                    shoukaku.removeNode(name, 'flapping');
                    if (urlKeyResolved) urlsWithNode.delete(urlKeyResolved);
                    nameToUrl.delete(name);
                } catch (err) {
                    logger.warn(`removeNode(${name}) falló`, { error: err.message });
                }
            }
        }
        scheduleEmergencyCheck();
    });

    function scheduleEmergencyCheck() {
        if (emergencyTimer) clearTimeout(emergencyTimer);
        emergencyTimer = setTimeout(() => {
            emergencyTimer = null;
            void maybeEmergencyRefresh();
        }, EMERGENCY_DEBOUNCE_MS);
    }

    setInterval(() => {
        void ingestNewNodes('hourly');
    }, HOUR_MS);

    setInterval(() => {
        if (connectedCount() === 0) {
            void recoverPool('watchdog');
        }
    }, WATCHDOG_MS);

    logger.info('Lavalink pool: mantenimiento activo (refresh horario, emergencia, watchdog, anti-flapping)');

    return {
        requestReseed: (reason = 'play') => recoverPool(reason),
        forceReseed: (reason = 'play-failed') => fullReseed(reason)
    };
}
