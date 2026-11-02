import logger from './logger.js';
import { isLikelySpotifyUrl } from './playSearchShared.js';
import { getConnectedLavalinkNodes, waitForPlayLavalinkNodes } from '../services/lavalinkNodes.js';
import { forcePoolReseed, requestPoolReseed } from '../services/lavalinkPool.js';
import { NODE_RETRY_DELAY_MS } from '../config/constants.js';

export class PlayerSetupError extends Error {
    constructor(userMessage) {
        super(userMessage);
        this.name = 'PlayerSetupError';
        this.userMessage = userMessage;
    }
}

export function isSessionError(err) {
    const msg = String(err?.message ?? '');
    // 'Session not found': Lavalink REST; 'missing session id': Shoukaku sin sesión de voz.
    return err?.status === 404 || msg.includes('Session not found') || msg.includes('missing session id');
}

export async function destroyStalePlayer(kazagumo, guildId) {
    const stale = kazagumo.players.get(guildId);
    if (stale) {
        try {
            await stale.destroy();
        } catch {
            /* ignore */
        }
    }
    try {
        const conn = kazagumo.shoukaku.connections.get(guildId);
        if (conn) {
            conn.disconnect();
            kazagumo.shoukaku.connections.delete(guildId);
        }
    } catch {
        /* ignore */
    }
}

/**
 * Intenta crear el player probando cada nodo en orden; limpia el intento fallido antes del siguiente.
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {{ guildId: string, voiceId: string, textId?: string | null }} opts
 * @param {import('shoukaku').Node[]} nodes
 * @returns {Promise<import('kazagumo').KazagumoPlayer | null>}
 */
export async function createPlayerOnNodes(kazagumo, { guildId, voiceId, textId }, nodes) {
    for (const node of nodes) {
        try {
            logger.debug(`Intentando nodo: ${node.name}`, { guildId });
            const player = await kazagumo.createPlayer({
                guildId,
                voiceId,
                ...(textId ? { textId } : {}),
                deaf: true,
                nodeName: node.name
            });
            logger.info(`Conectado via nodo: ${node.name}`, { guildId });
            return player;
        } catch (err) {
            logger.warn(`Nodo ${node.name} falló: ${err.message}`, { guildId });
            await destroyStalePlayer(kazagumo, guildId);
            await new Promise(r => setTimeout(r, NODE_RETRY_DELAY_MS));
        }
    }
    return null;
}

/**
 * Obtiene el player existente o crea uno nuevo.
 * Lanza PlayerSetupError con mensaje amigable si no se puede crear.
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('discord.js').VoiceBasedChannel} voiceChannel
 * @returns {Promise<import('kazagumo').KazagumoPlayer>}
 */
export async function resolveOrCreatePlayer(kazagumo, interaction, voiceChannel) {
    const guildId = interaction.guild.id;
    let player = kazagumo.players.get(guildId);

    const botMember = interaction.guild.members.cache.get(interaction.client.user.id);
    const botVoiceChannel = botMember?.voice?.channel;

    if (player) {
        if (!botVoiceChannel) {
            logger.warn('Bot no está en canal de voz pero el player existe, destruyendo', { guildId });
            await player.destroy().catch(() => {});
            player = null;
        } else if (player.voiceId !== voiceChannel.id) {
            try {
                await player.setVoiceChannel(voiceChannel.id);
            } catch (err) {
                logger.error('Error al mover el player a otro canal', { guildId, error: err.message });
                await player.destroy().catch(() => {});
                player = null;
            }
        }
        if (player) player.setTextChannel(interaction.channel.id);
    }

    if (!player) {
        const playerOpts = { guildId, voiceId: voiceChannel.id, textId: interaction.channel.id };
        const allNodes = [...kazagumo.shoukaku.nodes.values()];
        let connectedNodes = getConnectedLavalinkNodes(kazagumo);

        logger.debug(`Creando player | nodos: ${allNodes.length} total, ${connectedNodes.length} conectados`, {
            guildId
        });

        if (connectedNodes.length === 0) {
            logger.warn('Sin nodos Lavalink conectados; solicitando reseed del pool', { guildId });
            await requestPoolReseed('play');
            connectedNodes = await waitForPlayLavalinkNodes(kazagumo);
        }

        if (connectedNodes.length === 0) {
            throw new PlayerSetupError(
                '❌ No hay nodos de Lavalink disponibles en este momento. Intentá de nuevo en unos instantes.'
            );
        }

        player = await createPlayerOnNodes(kazagumo, playerOpts, connectedNodes);

        if (!player) {
            logger.warn('Todos los nodos conectados fallaron al crear el player; forzando refresh del pool', {
                guildId
            });
            await forcePoolReseed('play-failed');
            connectedNodes = await waitForPlayLavalinkNodes(kazagumo);
            if (connectedNodes.length > 0) {
                player = await createPlayerOnNodes(kazagumo, playerOpts, connectedNodes);
            }
        }

        if (!player) {
            throw new PlayerSetupError('❌ No se pudo conectar al canal de voz. Todos los nodos fallaron. Intentá de nuevo.');
        }
    }

    return player;
}

/**
 * @param {Error & { status?: number }} err
 * @param {string} query
 */
export function buildPlayErrorMessage(err, query) {
    if (err instanceof PlayerSetupError) return err.userMessage;

    const msg = String(err?.message ?? '');
    const status = err?.status;

    if (status === 429 || msg.includes('429')) {
        return '❌ Demasiadas solicitudes. Esperá un momento antes de intentar de nuevo.';
    }
    if (msg.includes('timeout') || msg.includes('handshake')) {
        return '❌ Tiempo de conexión agotado. Intentá de nuevo.';
    }
    if (isLikelySpotifyUrl(query) && /spotify|lavalink|load|resolve|plugin|source/i.test(msg)) {
        return (
            '❌ **Spotify:** el nodo no pudo resolver esa URL (suele faltar **LavaSrc** u otra fuente Spotify en Lavalink). ' +
            'Usá YouTube o texto, o un nodo con el plugin configurado.'
        );
    }
    return '❌ Ocurrió un error al reproducir. Intentá de nuevo.';
}
