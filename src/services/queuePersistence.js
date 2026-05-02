import { mkdirSync } from 'fs';
import { readFile, writeFile } from 'fs/promises';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';
import { KazagumoTrack } from 'kazagumo';
import logger from '../utils/logger.js';
import {
    LAVALINK_RESTORE_POLL_MS,
    LAVALINK_RESTORE_WAIT_MS,
    NODE_RETRY_DELAY_MS
} from '../config/constants.js';
import { destroyStalePlayer } from '../utils/playerUtils.js';
import { peekPlayerState, setAutoplay, setAutoplayContext, setLoopMode } from './playerState.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const dataDir = join(__dirname, '..', '..', 'data');
const queuesPath = join(dataDir, 'queues.json');

/** @type {Map<string, object>} */
const pendingByGuild = new Map();

async function hydratePlayerFromPending(kazagumo, client, guildId, pending, requesterUser) {
    const player = kazagumo.players.get(guildId);
    if (!player) return { ok: false, tracks: 0 };

    const toAdd = [];
    if (pending.current) {
        const t = await deserializeTrack(kazagumo, client, pending.current, requesterUser);
        if (t) toAdd.push(t);
    }
    for (const p of pending.queue) {
        const t = await deserializeTrack(kazagumo, client, p, requesterUser);
        if (t) toAdd.push(t);
    }
    for (const t of toAdd) await player.queue.add(t);

    if (pending.previous.length > 0) {
        const prev = [];
        for (const p of pending.previous) {
            const t = await deserializeTrack(kazagumo, client, p, requesterUser);
            if (t) prev.push(t);
        }
        player.queue.previous = prev;
    }

    setLoopMode(guildId, pending._loopMode ?? 'off');
    player.setLoop('none');
    setAutoplay(guildId, pending._autoplay);
    if (pending._autoplay && pending._autoplayContext) {
        const c = await deserializeTrack(kazagumo, client, pending._autoplayContext, requesterUser);
        if (c) setAutoplayContext(guildId, c);
    }

    const hasTracks = toAdd.length > 0;
    return { ok: hasTracks, tracks: toAdd.length, player };
}

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 */
function getConnectedLavalinkNodes(kazagumo) {
    return [...kazagumo.shoukaku.nodes.values()].filter(n => n.state === 1);
}

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 */
async function waitForConnectedLavalinkNodes(kazagumo) {
    const deadline = Date.now() + LAVALINK_RESTORE_WAIT_MS;
    while (Date.now() < deadline) {
        const nodes = getConnectedLavalinkNodes(kazagumo);
        if (nodes.length > 0) return nodes;
        await new Promise(r => setTimeout(r, LAVALINK_RESTORE_POLL_MS));
    }
    return [];
}

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {string} guildId
 * @param {string} voiceId
 * @param {string | null} textId
 * @param {import('shoukaku').Node[]} nodes
 */
async function createRestoredPlayer(kazagumo, guildId, voiceId, textId, nodes) {
    for (const node of nodes) {
        try {
            /** @type {{ guildId: string, voiceId: string, deaf: boolean, nodeName: string, textId?: string }} */
            const opts = {
                guildId,
                voiceId,
                deaf: true,
                nodeName: node.name
            };
            if (textId) opts.textId = textId;
            return await kazagumo.createPlayer(opts);
        } catch (err) {
            logger.warn(`Rejoin automático: falló createPlayer en nodo ${node.name}`, {
                guildId,
                error: err.message
            });
            await destroyStalePlayer(kazagumo, guildId);
            await new Promise(r => setTimeout(r, NODE_RETRY_DELAY_MS));
        }
    }
    return null;
}

function trackToPlain(track) {
    if (!track || !track.track) return null;
    const rid = track.requester?.id != null ? String(track.requester.id) : null;
    return {
        encoded: track.track,
        info: {
            title: track.title,
            uri: track.uri,
            identifier: track.identifier,
            author: track.author,
            sourceName: track.sourceName,
            isSeekable: track.isSeekable,
            isStream: track.isStream,
            length: track.length,
            artworkUrl: track.thumbnail
        },
        requesterId: rid
    };
}

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 */
export async function saveQueues(kazagumo) {
    try {
        mkdirSync(dataDir, { recursive: true });
    } catch { /* ignore */ }

    const guilds = {};
    for (const player of kazagumo.players.values()) {
        const current = trackToPlain(player.queue.current);
        const queue = player.queue.map(t => trackToPlain(t)).filter(Boolean);
        const previous = (player.queue.previous || []).map(t => trackToPlain(t)).filter(Boolean);
        const s = peekPlayerState(player.guildId);
        const ctxTrack = s?.autoplayContext ?? null;
        const ctx = ctxTrack ? trackToPlain(ctxTrack) : null;

        if (!current && queue.length === 0 && previous.length === 0) continue;

        guilds[player.guildId] = {
            voiceId: player.voiceId,
            textId: player.textId ?? null,
            current,
            queue,
            previous,
            _positionMs: Math.max(0, Number(player.position ?? 0)),
            _wasPlaying: Boolean(player.playing),
            _loopMode: s?.loopMode ?? 'off',
            _autoplay: Boolean(s?.autoplay),
            _autoplayContext: ctx
        };
    }

    const payload = {
        version: 1,
        savedAt: new Date().toISOString(),
        guilds
    };

    await writeFile(queuesPath, JSON.stringify(payload, null, 2), 'utf8');
    logger.info(`Colas guardadas (${Object.keys(guilds).length} guild(s))`);
}

/**
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('discord.js').Client} client
 */
export async function restoreQueues(kazagumo, client) {
    let raw;
    try {
        raw = await readFile(queuesPath, 'utf8');
    } catch {
        return;
    }

    let data;
    try {
        data = JSON.parse(raw);
    } catch {
        logger.warn('queues.json malformado, ignorando');
        return;
    }

    if (!data || data.version !== 1 || !data.guilds || typeof data.guilds !== 'object') return;

    const guildEntries = Object.entries(data.guilds);
    const wantsAutoRejoin = guildEntries.some(([guildId, entry]) => {
        if (!entry || (!entry.current && !(entry.queue?.length) && !(entry.previous?.length))) return false;
        if (!entry._wasPlaying || !entry.voiceId) return false;
        return Boolean(client.guilds.cache.get(guildId));
    });

    let rejoinNodes = [];
    if (wantsAutoRejoin) {
        rejoinNodes = await waitForConnectedLavalinkNodes(kazagumo);
        if (rejoinNodes.length === 0) {
            logger.warn('Restore: Lavalink sin nodos listos tras esperar; rejoin automático deshabilitado para esta sesión');
        }
    }

    for (const [guildId, entry] of guildEntries) {
        const guild = client.guilds.cache.get(guildId);
        if (!guild) continue;
        if (!entry || (!entry.current && !(entry.queue?.length) && !(entry.previous?.length))) continue;

        pendingByGuild.set(guildId, {
            voiceId: entry.voiceId ?? null,
            textId: entry.textId ?? null,
            current: entry.current ?? null,
            queue: Array.isArray(entry.queue) ? entry.queue : [],
            previous: Array.isArray(entry.previous) ? entry.previous : [],
            _positionMs: Math.max(0, Number(entry._positionMs ?? 0)),
            _wasPlaying: Boolean(entry._wasPlaying),
            _loopMode: entry._loopMode ?? 'off',
            _autoplay: Boolean(entry._autoplay),
            _autoplayContext: entry._autoplayContext ?? null
        });

        logger.info('Cola pendiente cargada para restauración', { guildId });

        if (entry._wasPlaying && entry.voiceId && rejoinNodes.length > 0) {
            try {
                const voice = await guild.channels.fetch(entry.voiceId).catch(() => null);
                const hasHumans = Boolean(voice?.isVoiceBased?.() && voice.members?.some(m => !m.user.bot));

                if (!voice?.isVoiceBased?.()) {
                    logger.warn('No se pudo hacer rejoin automático: canal de voz no disponible', { guildId, voiceId: entry.voiceId });
                } else {
                    const player = await createRestoredPlayer(
                        kazagumo,
                        guildId,
                        entry.voiceId,
                        entry.textId ?? null,
                        rejoinNodes
                    );

                    if (!player) {
                        logger.warn('Rejoin automático: createPlayer falló en todos los nodos', { guildId });
                    } else {
                        const hydrated = await hydratePlayerFromPending(
                            kazagumo,
                            client,
                            guildId,
                            pendingByGuild.get(guildId),
                            client.user
                        );

                        const q = hydrated.player?.queue;
                        const canPlay =
                            hydrated.ok && q && (q.current || q.length > 0);

                        if (canPlay) {
                            await hydrated.player.play();
                            if (entry._positionMs > 0) {
                                await hydrated.player.seek(entry._positionMs).catch(() => {});
                            }
                            pendingByGuild.delete(guildId);
                            logger.info('Rejoin automático aplicado tras restart', {
                                guildId,
                                voiceId: entry.voiceId,
                                hadHumansAtRestore: hasHumans,
                                resumedAtMs: entry._positionMs
                            });
                            continue;
                        }

                        await player.destroy().catch(() => {});
                    }
                }
            } catch (err) {
                logger.warn('No se pudo aplicar rejoin automático tras restart', {
                    guildId,
                    error: err.message
                });
            }
        }
    }
}

async function deserializeTrack(kazagumo, client, plain, fallbackUser) {
    if (!plain?.encoded || !plain.info) return null;
    const raw = { encoded: plain.encoded, info: { ...plain.info } };
    let requester = fallbackUser;
    if (plain.requesterId) {
        requester = await client.users.fetch(plain.requesterId).catch(() => fallbackUser);
    }
    const kt = new KazagumoTrack(raw, requester);
    kt.setKazagumo(kazagumo);
    return kt;
}

/**
 * Si hay snapshot pendiente para el guild, agrega current + cola + previous y flags.
 * Solo llamar con un `player` ya existente (p. ej. tras `/play`).
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 * @param {import('discord.js').User} requesterUser
 */
export async function applyPendingRestoreIfAny(kazagumo, client, guildId, requesterUser) {
    const pending = pendingByGuild.get(guildId);
    if (!pending) return;

    if (!kazagumo.players.get(guildId)) return;

    pendingByGuild.delete(guildId);

    try {
        const hydrated = await hydratePlayerFromPending(kazagumo, client, guildId, pending, requesterUser);

        logger.info('Cola restaurada correctamente', { guildId, tracks: hydrated.tracks });
    } catch (err) {
        logger.error('Error restaurando cola', { guildId, error: err.message });
    }
}
