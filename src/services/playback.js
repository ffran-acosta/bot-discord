import { EmbedBuilder } from 'discord.js';
import { applyPendingRestoreIfAny } from './queuePersistence.js';
import { syncNowPlayingPanel } from './nowPlayingMessage.js';
import {
    MAX_PLAYLIST_TRACKS,
    RETRY_DELAY_MS
} from '../config/constants.js';
import {
    hasYoutubeListParameter,
    isLikelySpotifyUrl
} from '../utils/playSearchShared.js';
import { formatTime } from '../utils/formatTime.js';
import {
    resolveOrCreatePlayer,
    destroyStalePlayer,
    isSessionError,
    PlayerSetupError,
    buildPlayErrorMessage
} from '../utils/playerUtils.js';
import logger from '../utils/logger.js';
import { cancelDisconnect } from './timers.js';
import { isAutoplay, setAutoplayContext } from './playerState.js';

/**
 * @param {import('kazagumo').KazagumoPlayer} player
 * @param {import('kazagumo').KazagumoTrack[]} tracks
 */
function enqueueAtQueueFront(player, tracks) {
    const q = player.queue;
    if (q.current) {
        q.splice(0, 0, ...tracks);
        q.emitChanges?.();
    } else {
        q.add(tracks);
    }
}

/**
 * @param {import('discord.js').ChatInputCommandInteraction} interaction
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {string} query
 * @param {{ position: 'end' | 'front' }} opts
 */
export async function searchAndEnqueue(interaction, kazagumo, query, { position }) {
    const guildId = interaction.guild.id;
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        await interaction.editReply('❌ Tenés que estar en un canal de voz para usar este comando.');
        return;
    }

    let retried = false;
    const attempt = async () => {
        try {
            const player = await resolveOrCreatePlayer(kazagumo, interaction, voiceChannel);

            const searchOpts = { requester: interaction.user };
            if (player.shoukaku?.node?.name) searchOpts.nodeName = player.shoukaku.node.name;

            const logPrefix = position === 'front' ? 'Buscando (siguiente-tema)' : 'Buscando';
            logger.debug(`${logPrefix}: ${query}`, { guildId });
            const result = await kazagumo.search(query, searchOpts);

            if (!result.tracks.length) {
                logger.info('Sin resultados', { guildId, query });
                if (isLikelySpotifyUrl(query)) {
                    return interaction.editReply(
                        '❌ **Spotify:** este nodo de Lavalink no devolvió audio para esa URL. ' +
                            'Hace falta un servidor con fuente tipo **LavaSrc / LavaSource** (u otro plugin que resuelva Spotify). ' +
                            'Probá con un enlace de **YouTube** o una búsqueda por texto, o usá un Lavalink propio con el plugin instalado.'
                    );
                }
                return interaction.editReply('❌ No se encontraron resultados para tu búsqueda.');
            }

            let isPlaylist = result.type === 'PLAYLIST';
            let tracksToAdd = isPlaylist ? [...result.tracks] : [result.tracks[0]];

            if (!isPlaylist && result.type === 'SEARCH' && result.tracks.length > 1 && hasYoutubeListParameter(query)) {
                isPlaylist = true;
                tracksToAdd = result.tracks.slice(0, MAX_PLAYLIST_TRACKS);
                logger.info(`URL de lista YouTube devolvió SEARCH; tratando como playlist (${tracksToAdd.length} pistas)`, { guildId });
            }

            if (isPlaylist) tracksToAdd = tracksToAdd.slice(0, MAX_PLAYLIST_TRACKS);

            if (isPlaylist && tracksToAdd.length === 0) {
                return interaction.editReply('❌ La playlist no tiene pistas cargables (lista vacía o error del nodo).');
            }

            const track = tracksToAdd[0];
            const isCurrentlyPlaying = player.playing || player.paused;

            logger.info(
                isPlaylist
                    ? `Playlist${position === 'front' ? ' (siguiente-tema)' : ''}: ${result.playlistName ?? 'Desconocida'} (${tracksToAdd.length} pistas)`
                    : `Encontrado: ${track.title}`,
                { guildId }
            );

            if (position === 'front') {
                enqueueAtQueueFront(player, tracksToAdd);
            } else {
                for (const t of tracksToAdd) await player.queue.add(t);
            }

            cancelDisconnect(guildId);

            await applyPendingRestoreIfAny(kazagumo, interaction.client, guildId, interaction.user);

            if (isAutoplay(guildId)) setAutoplayContext(guildId, track);

            const color = position === 'front' ? 0xFEE75C : 0x5865F2;
            const embed = new EmbedBuilder().setColor(color).setThumbnail(track.thumbnail || null).setTimestamp();

            if (isPlaylist) {
                const plTitle = result.playlistName ?? (hasYoutubeListParameter(query) ? 'YouTube playlist' : 'Playlist');
                if (position === 'front') {
                    embed
                        .setTitle('⏩ Playlist — a continuación')
                        .setDescription(`**${plTitle}** — ${tracksToAdd.length} canción(es) insertadas al frente de la cola`)
                        .addFields({ name: '👤 Pedido por', value: `${interaction.user}`, inline: true });
                } else {
                    embed
                        .setTitle('📋 Playlist agregada')
                        .setDescription(`**${plTitle}** — ${tracksToAdd.length} canción(es) agregadas a la cola`)
                        .addFields({ name: '👤 Pedido por', value: `${interaction.user}`, inline: true });
                }
                if (result.tracks.length > tracksToAdd.length) {
                    embed.setFooter({ text: `Mostrando las primeras ${tracksToAdd.length} pistas (límite ${MAX_PLAYLIST_TRACKS}).` });
                }
            } else if (position === 'front') {
                embed
                    .setTitle('⏩ Reproducir a continuación')
                    .setDescription(`**[${track.title}](${track.uri})** — insertada después de la canción actual`)
                    .addFields(
                        { name: '👤 Pedido por', value: `${interaction.user}`, inline: true },
                        { name: '⏱️ Duración', value: track.length > 0 ? formatTime(track.length) : 'En vivo', inline: true }
                    );
            } else {
                embed
                    .setTitle('🎵 Canción agregada')
                    .setDescription(`**[${track.title}](${track.uri})**`)
                    .addFields(
                        { name: '👤 Pedido por', value: `${interaction.user}`, inline: true },
                        { name: '⏱️ Duración', value: track.length > 0 ? formatTime(track.length) : 'En vivo', inline: true }
                    );
            }

            if (!isCurrentlyPlaying) {
                try {
                    logger.info(`Iniciando reproducción: ${track.title}`, { guildId });
                    await player.play();
                    if (!isPlaylist) {
                        embed.setDescription(`🎵 **Reproduciendo:** [${track.title}](${track.uri})`);
                    }
                } catch (playError) {
                    logger.error('Error al iniciar reproducción', { guildId, error: playError.message });
                }
            }

            await interaction.editReply({ embeds: [embed] });
            await syncNowPlayingPanel(interaction.client, kazagumo, player).catch(() => {});
        } catch (err) {
            if (err instanceof PlayerSetupError) {
                return interaction.editReply(err.userMessage);
            }
            if (isSessionError(err) && !retried) {
                retried = true;
                logger.warn('Sesión expirada, destruyendo player y reintentando...', { guildId });
                await destroyStalePlayer(kazagumo, guildId);
                await new Promise(r => setTimeout(r, RETRY_DELAY_MS));
                return attempt();
            }
            logger.error(`Error en ${position === 'front' ? 'siguiente-tema' : 'reproducir'}`, { guildId, error: err.message, stack: err.stack });
            await interaction.editReply(buildPlayErrorMessage(err, query));
        }
    };

    return attempt();
}
