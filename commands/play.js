import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { applyPendingRestoreIfAny } from '../src/services/queuePersistence.js';
import { syncNowPlayingPanel } from '../src/services/nowPlayingMessage.js';
import {
    MAX_PLAYLIST_TRACKS,
    formatTrackDuration,
    hasYoutubeListParameter,
    isLikelySpotifyUrl
} from '../src/utils/playSearchShared.js';
import {
    resolveOrCreatePlayer,
    destroyStalePlayer,
    isSessionError,
    PlayerSetupError,
    buildPlayErrorMessage
} from '../src/utils/playerUtils.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('play')
        .setDescription('Reproduce una canción o la agrega a la cola')
        .addStringOption(option =>
            option.setName('song')
                .setDescription('Nombre o URL de la canción')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        await interaction.deferReply();

        const query = interaction.options.getString('song') || interaction.options.getString('cancion');
        const voiceChannel = interaction.member.voice.channel;
        const guildId = interaction.guild.id;

        logger.info('Comando play', { guildId, user: interaction.user.tag, query });

        if (!voiceChannel) {
            return interaction.editReply('❌ Tenés que estar en un canal de voz para usar este comando.');
        }

        let retried = false;
        const attempt = async () => {
            try {
                const player = await resolveOrCreatePlayer(kazagumo, interaction, voiceChannel);

                const searchOpts = { requester: interaction.user };
                if (player.shoukaku?.node?.name) searchOpts.nodeName = player.shoukaku.node.name;

                logger.debug(`Buscando: ${query}`, { guildId });
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
                        ? `Playlist: ${result.playlistName ?? 'Desconocida'} (${tracksToAdd.length} pistas)`
                        : `Encontrado: ${track.title}`,
                    { guildId }
                );

                for (const t of tracksToAdd) await player.queue.add(t);

                await applyPendingRestoreIfAny(kazagumo, interaction.client, guildId, interaction.user);

                if (player._autoplay) player._autoplayContext = track;

                const embed = new EmbedBuilder()
                    .setColor(0x5865F2)
                    .setThumbnail(track.thumbnail || null)
                    .setTimestamp();

                if (isPlaylist) {
                    const plTitle = result.playlistName ?? (hasYoutubeListParameter(query) ? 'YouTube playlist' : 'Playlist');
                    embed
                        .setTitle('📋 Playlist agregada')
                        .setDescription(`**${plTitle}** — ${tracksToAdd.length} canción(es) agregadas a la cola`)
                        .addFields({ name: '👤 Pedido por', value: `${interaction.user}`, inline: true });
                    if (result.tracks.length > tracksToAdd.length) {
                        embed.setFooter({ text: `Mostrando las primeras ${tracksToAdd.length} pistas (límite ${MAX_PLAYLIST_TRACKS}).` });
                    }
                } else {
                    embed
                        .setTitle('🎵 Canción agregada')
                        .setDescription(`**[${track.title}](${track.uri})**`)
                        .addFields(
                            { name: '👤 Pedido por', value: `${interaction.user}`, inline: true },
                            { name: '⏱️ Duración', value: track.length > 0 ? formatTrackDuration(track.length) : 'En vivo', inline: true }
                        );
                }

                if (!isCurrentlyPlaying) {
                    try {
                        logger.info(`Iniciando reproducción: ${track.title}`, { guildId });
                        await player.play();
                        if (!isPlaylist) embed.setDescription(`🎵 **Reproduciendo:** [${track.title}](${track.uri})`);
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
                    await new Promise(r => setTimeout(r, 800));
                    return attempt();
                }
                logger.error('Error en play', { guildId, error: err.message, stack: err.stack });
                await interaction.editReply(buildPlayErrorMessage(err, query));
            }
        };

        return attempt();
    }
};
