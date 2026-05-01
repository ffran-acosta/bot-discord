/**
 * @typedef {Object} GuardResult
 * @property {import('kazagumo').KazagumoPlayer} player
 * @property {import('discord.js').VoiceChannel} voiceChannel
 */

/**
 * Valida que el usuario esté en un canal de voz.
 * @returns {import('discord.js').VoiceChannel | null}
 */
export function requireVoiceChannel(interaction) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
        interaction.reply('❌ Tenés que estar en un canal de voz para usar este comando.');
        return null;
    }
    return voiceChannel;
}

/**
 * Valida que exista un player activo en el guild.
 * @returns {import('kazagumo').KazagumoPlayer | null}
 */
export function requirePlayer(interaction, kazagumo) {
    const player = kazagumo.players.get(interaction.guild.id);
    if (!player) {
        interaction.reply('❌ No hay ninguna canción en reproducción.');
        return null;
    }
    return player;
}

/**
 * Valida que el usuario esté en el mismo canal de voz que el bot.
 * Requiere un player ya validado.
 * @returns {boolean} true si la validación pasa
 */
export function requireSameVoiceChannel(interaction, player) {
    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel || player.voiceId !== voiceChannel.id) {
        interaction.reply('❌ Tenés que estar en el mismo canal de voz que el bot.');
        return false;
    }
    return true;
}

/**
 * Guard combinado: player + mismo canal de voz.
 * @returns {{ player: import('kazagumo').KazagumoPlayer } | null}
 */
export function requirePlayerInVoice(interaction, kazagumo) {
    const player = requirePlayer(interaction, kazagumo);
    if (!player) return null;

    if (!requireSameVoiceChannel(interaction, player)) return null;

    return { player };
}
