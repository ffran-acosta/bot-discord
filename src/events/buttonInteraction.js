import { syncNowPlayingPanel, stopNowPlayingUpdates } from '../services/nowPlayingMessage.js';
import logger from '../utils/logger.js';

/**
 * @param {import('discord.js').ButtonInteraction} interaction
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @param {import('discord.js').Client} client
 * @returns {Promise<boolean>} true si se manejó el botón `player:*`
 */
export async function tryHandlePlayerButtons(interaction, kazagumo, client) {
    if (!interaction.isButton()) return false;

    const id = interaction.customId;
    if (!id.startsWith('player:')) return false;

    const parts = id.split(':');
    if (parts.length !== 3) return false;

    const [, action, guildId] = parts;
    if (guildId !== interaction.guildId) {
        await interaction.reply({ content: '❌ Servidor no válido.', flags: 64 }).catch(() => {});
        return true;
    }

    const player = kazagumo.players.get(interaction.guild.id);
    if (!player) {
        await interaction.reply({ content: '❌ No hay reproductor activo.', flags: 64 }).catch(() => {});
        return true;
    }

    const voiceChannel = interaction.member?.voice?.channel;
    if (!voiceChannel || player.voiceId !== voiceChannel.id) {
        await interaction.reply({ content: '❌ Tenés que estar en el mismo canal de voz que el bot.', flags: 64 }).catch(() => {});
        return true;
    }

    await interaction.deferUpdate().catch(() => {});

    try {
        switch (action) {
            case 'togglepause': {
                if (!player.queue.current) break;
                await player.pause(!player.paused);
                break;
            }
            case 'skip': {
                if (!player.queue.current) break;
                await player.skip();
                break;
            }
            case 'stop': {
                player.queue.clear();
                await player.destroy();
                await stopNowPlayingUpdates(client, guildId);
                return true;
            }
            case 'clearqueue': {
                if (!player.queue.current) break;
                player.queue.clear();
                break;
            }
            default:
                break;
        }
    } catch (err) {
        logger.error('Error ejecutando acción de botón de player', { action, guildId, error: err.message });
    }

    const p = kazagumo.players.get(interaction.guild.id);
    if (p) await syncNowPlayingPanel(client, kazagumo, p);

    return true;
}
