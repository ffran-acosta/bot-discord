import logger from './logger.js';
import { isLikelySpotifyUrl } from './playSearchShared.js';

export class PlayerSetupError extends Error {
    constructor(userMessage) {
        super(userMessage);
        this.name = 'PlayerSetupError';
        this.userMessage = userMessage;
    }
}

export function isSessionError(err) {
    return (
        err?.status === 404 ||
        err?.message?.includes('Session not found') ||
        err?.message?.includes('session')
    );
}

export async function destroyStalePlayer(kazagumo, guildId) {
    const stale = kazagumo.players.get(guildId);
    if (stale) {
        try { await stale.destroy(); } catch { /* ignore */ }
    }
    try {
        const conn = kazagumo.shoukaku.connections.get(guildId);
        if (conn) {
            conn.disconnect();
            kazagumo.shoukaku.connections.delete(guildId);
        }
    } catch { /* ignore */ }
}

/**
 * Obtiene el player existente o crea uno nuevo.
 * Lanza PlayerSetupError con mensaje amigable si no se puede crear.
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('discord.js').BaseInteraction} interaction
 * @param {import('discord.js').VoiceChannel} voiceChannel
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
            try { await player.destroy(); } catch { /* ignore */ }
            player = null;
        } else if (player.voiceId !== voiceChannel.id) {
            try {
                await player.setVoiceChannel(voiceChannel.id);
            } catch (err) {
                logger.error('Error al mover el player a otro canal', { guildId, error: err.message });
                try { await player.destroy(); } catch { /* ignore */ }
                player = null;
            }
        }
        if (player) player.setTextChannel(interaction.channel.id);
    }

    if (!player) {
        const allNodes = [...kazagumo.shoukaku.nodes.values()];
        const connectedNodes = allNodes.filter(n => n.state === 1);

        logger.debug(`Creando player | nodos: ${allNodes.length} total, ${connectedNodes.length} conectados`, { guildId });

        if (connectedNodes.length === 0) {
            throw new PlayerSetupError('❌ No hay nodos de Lavalink disponibles en este momento. Intentá de nuevo en unos instantes.');
        }

        for (const node of connectedNodes) {
            try {
                logger.debug(`Intentando nodo: ${node.name}`, { guildId });
                player = await kazagumo.createPlayer({
                    guildId,
                    voiceId: voiceChannel.id,
                    textId: interaction.channel.id,
                    deaf: true,
                    nodeName: node.name
                });
                logger.info(`Conectado via nodo: ${node.name}`, { guildId });
                break;
            } catch (err) {
                logger.warn(`Nodo ${node.name} falló: ${err.message}`, { guildId });
                try {
                    const stale = kazagumo.players.get(guildId);
                    if (stale) await stale.destroy();
                } catch { /* ignore */ }
                try {
                    const conn = kazagumo.shoukaku.connections.get(guildId);
                    if (conn) {
                        conn.disconnect();
                        kazagumo.shoukaku.connections.delete(guildId);
                    }
                } catch { /* ignore */ }
                await new Promise(r => setTimeout(r, 500));
            }
        }

        if (!player) {
            throw new PlayerSetupError('❌ No se pudo conectar al canal de voz. Todos los nodos fallaron. Intentá de nuevo.');
        }
    }

    return player;
}

/**
 * @param {Error} err
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
