import { AUTOPLAY_HISTORY_SIZE } from '../config/constants.js';

/** @typedef {{ loopMode: string, autoplay: boolean, autoplayContext: import('kazagumo').KazagumoTrack | null, autoplayHistory: import('kazagumo').KazagumoTrack[], skipRequested: boolean }} GuildPlayerState */

/** @type {Map<string, GuildPlayerState>} */
const stateByGuild = new Map();

function defaults() {
    return {
        loopMode: 'off',
        autoplay: false,
        autoplayContext: null,
        autoplayHistory: [],
        skipRequested: false
    };
}

/**
 * @param {string} guildId
 */
export function getPlayerState(guildId) {
    let s = stateByGuild.get(guildId);
    if (!s) {
        s = defaults();
        stateByGuild.set(guildId, s);
    }
    return s;
}

/**
 * @param {string} guildId
 * @returns {GuildPlayerState | undefined}
 */
export function peekPlayerState(guildId) {
    return stateByGuild.get(guildId);
}

export function clearPlayerState(guildId) {
    stateByGuild.delete(guildId);
}

/**
 * @param {string} guildId
 * @param {'off'|'track'|'queue'} mode
 */
export function setLoopMode(guildId, mode) {
    getPlayerState(guildId).loopMode = mode;
}

/**
 * @param {string} guildId
 */
export function getLoopMode(guildId) {
    return getPlayerState(guildId).loopMode;
}

/**
 * @param {string} guildId
 * @param {boolean} enabled
 */
export function setAutoplay(guildId, enabled) {
    getPlayerState(guildId).autoplay = enabled;
}

/**
 * @param {string} guildId
 */
export function isAutoplay(guildId) {
    return getPlayerState(guildId).autoplay;
}

/**
 * @param {string} guildId
 * @param {import('kazagumo').KazagumoTrack | null} track
 */
export function setAutoplayContext(guildId, track) {
    getPlayerState(guildId).autoplayContext = track;
}

/**
 * @param {string} guildId
 */
export function getAutoplayContext(guildId) {
    return getPlayerState(guildId).autoplayContext;
}

/**
 * @param {string} guildId
 * @param {import('kazagumo').KazagumoTrack} track
 */
export function pushAutoplayHistory(guildId, track) {
    const h = getPlayerState(guildId).autoplayHistory;
    h.push(track);
    while (h.length > AUTOPLAY_HISTORY_SIZE) h.shift();
}

/**
 * @param {string} guildId
 */
export function getAutoplayHistory(guildId) {
    return getPlayerState(guildId).autoplayHistory;
}

/**
 * Marca que la pista actual no debe repetirse con el loop de pista (skip o pista que falló).
 * @param {string} guildId
 */
export function markSkipRequested(guildId) {
    getPlayerState(guildId).skipRequested = true;
}

/**
 * Salta la pista actual sin que el loop de pista la repita.
 * @param {import('kazagumo').KazagumoPlayer} player
 */
export function skipTrack(player) {
    player.skip();
    // El evento end llega async desde Lavalink, así que marcar después no pierde la carrera.
    markSkipRequested(player.guildId);
}

/**
 * Devuelve si el fin de pista vino de un skip y limpia la marca.
 * @param {string} guildId
 */
export function consumeSkipRequested(guildId) {
    const s = getPlayerState(guildId);
    const requested = s.skipRequested;
    s.skipRequested = false;
    return requested;
}
