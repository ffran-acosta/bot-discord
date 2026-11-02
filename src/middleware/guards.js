import { MessageFlags } from 'discord.js';
import logger from '../utils/logger.js';

/**
 * Responde (efímero) el motivo por el que el guard rechazó la interacción.
 * @param {import('discord.js').RepliableInteraction} interaction
 * @param {string} content
 */
async function rejectWith(interaction, content) {
    try {
        await interaction.reply({ content, flags: MessageFlags.Ephemeral });
    } catch (error) {
        logger.warn('No se pudo responder el rechazo de un guard', { guildId: interaction.guildId, error: error.message });
    }
}

/**
 * Valida que el usuario esté en un canal de voz.
 * @param {import('discord.js').RepliableInteraction} interaction
 * @returns {Promise<import('discord.js').VoiceBasedChannel | null>}
 */
export async function requireVoiceChannel(interaction) {
    const voiceChannel = /** @type {import('discord.js').GuildMember} */ (interaction.member)?.voice?.channel;
    if (!voiceChannel) {
        await rejectWith(interaction, '❌ Tenés que estar en un canal de voz para usar este comando.');
        return null;
    }
    return voiceChannel;
}

/**
 * Valida que exista un player activo en el guild.
 * @param {import('discord.js').RepliableInteraction} interaction
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @returns {Promise<import('kazagumo').KazagumoPlayer | null>}
 */
export async function requirePlayer(interaction, kazagumo) {
    const player = kazagumo.players.get(interaction.guildId);
    if (!player) {
        await rejectWith(interaction, '❌ No hay ninguna canción en reproducción.');
        return null;
    }
    return player;
}

/**
 * Valida que el usuario esté en el mismo canal de voz que el bot.
 * Requiere un player ya validado.
 * @param {import('discord.js').RepliableInteraction} interaction
 * @param {import('kazagumo').KazagumoPlayer} player
 * @returns {Promise<boolean>} true si la validación pasa
 */
export async function requireSameVoiceChannel(interaction, player) {
    const voiceChannel = /** @type {import('discord.js').GuildMember} */ (interaction.member)?.voice?.channel;
    if (!voiceChannel || player.voiceId !== voiceChannel.id) {
        await rejectWith(interaction, '❌ Tenés que estar en el mismo canal de voz que el bot.');
        return false;
    }
    return true;
}

/**
 * Guard combinado: player + mismo canal de voz.
 * @param {import('discord.js').RepliableInteraction} interaction
 * @param {import('kazagumo').Kazagumo} kazagumo
 * @returns {Promise<{ player: import('kazagumo').KazagumoPlayer } | null>}
 */
export async function requirePlayerInVoice(interaction, kazagumo) {
    const player = await requirePlayer(interaction, kazagumo);
    if (!player) return null;

    if (!(await requireSameVoiceChannel(interaction, player))) return null;

    return { player };
}
