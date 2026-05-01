import { buildNowPlayingEmbed, buildPlayerButtons } from '../ui/playerEmbed.js';
import { NOW_PLAYING_REFRESH_MS } from '../config/constants.js';
import logger from '../utils/logger.js';

/** @type {Map<string, { channelId: string, messageId: string, timer: ReturnType<typeof setInterval> | null }>} */
const panelState = new Map();

function clearTimer(guildId) {
    const s = panelState.get(guildId);
    if (s?.timer) {
        clearInterval(s.timer);
        s.timer = null;
    }
}

/**
 * @param {import('discord.js').Client} client
 * @param {string} guildId
 */
export async function stopNowPlayingUpdates(client, guildId) {
    const s = panelState.get(guildId);
    if (!s) return;
    clearTimer(guildId);
    panelState.delete(guildId);

    if (!client) return;
    try {
        const ch = await client.channels.fetch(s.channelId).catch(() => null);
        const msg = await ch?.messages.fetch(s.messageId).catch(() => null);
        if (msg?.editable) {
            await msg.edit({ content: '⏹️ Sesión finalizada.', embeds: [], components: [] });
        }
    } catch { /* ignore */ }
}

/**
 * @param {import('discord.js').Client} client
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {string} guildId
 */
async function runTick(client, kazagumo, guildId) {
    const s = panelState.get(guildId);
    if (!s) return;
    const player = kazagumo.players.get(guildId);
    if (!player) {
        await stopNowPlayingUpdates(client, guildId);
        return;
    }

    const embed = buildNowPlayingEmbed(player);
    const components = buildPlayerButtons(player);

    try {
        const ch = await client.channels.fetch(s.channelId).catch(() => null);
        const msg = await ch?.messages.fetch(s.messageId).catch(() => null);
        if (!msg) {
            await stopNowPlayingUpdates(client, guildId);
            return;
        }
        await msg.edit({ embeds: [embed], components, content: null });
    } catch (err) {
        logger.warn('Error actualizando panel now-playing, deteniendo updates', { guildId, error: err.message });
        await stopNowPlayingUpdates(client, guildId);
    }
}

/**
 * @param {import('discord.js').Client} client
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('kazagumo').KazagumoPlayer} player
 */
export async function syncNowPlayingPanel(client, kazagumo, player) {
    const guildId = player.guildId;
    const guild = client.guilds.cache.get(guildId);
    if (!guild) return null;

    const textId = player.textId;
    if (!textId) return null;

    const channel = guild.channels.cache.get(textId);
    if (!channel?.isTextBased?.()) return null;

    const prev = panelState.get(guildId);
    if (prev?.timer) {
        clearInterval(prev.timer);
        prev.timer = null;
    }

    const embed = buildNowPlayingEmbed(player);
    const components = buildPlayerButtons(player);

    let msg = null;
    if (prev) {
        const ch = await client.channels.fetch(prev.channelId).catch(() => null);
        msg = await ch?.messages.fetch(prev.messageId).catch(() => null);
    }

    try {
        if (msg) {
            await msg.edit({ embeds: [embed], components, content: null });
        } else {
            msg = await channel.send({ embeds: [embed], components });
        }
    } catch (err) {
        logger.warn('Error enviando/editando panel now-playing', { guildId, error: err.message });
        return null;
    }

    const timer = setInterval(() => {
        void runTick(client, kazagumo, guildId);
    }, NOW_PLAYING_REFRESH_MS);

    panelState.set(guildId, {
        channelId: msg.channel.id,
        messageId: msg.id,
        timer
    });

    return msg;
}
