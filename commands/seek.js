import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatTime } from '../src/utils/formatTime.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';

function parseSeekInput(raw) {
    const s = raw.trim();
    if (!s) return null;
    if (/^\d+$/.test(s)) {
        return parseInt(s, 10) * 1000;
    }
    const parts = s.split(':').map(p => p.trim());
    if (parts.some(p => !/^\d+$/.test(p))) return null;
    const nums = parts.map(p => parseInt(p, 10));
    if (nums.length === 2) {
        return (nums[0] * 60 + nums[1]) * 1000;
    }
    if (nums.length === 3) {
        return (nums[0] * 3600 + nums[1] * 60 + nums[2]) * 1000;
    }
    return null;
}

export default {
    data: new SlashCommandBuilder()
        .setName('adelantar')
        .setDescription('Salta a una posición en la pista actual (mm:ss o segundos)')
        .addStringOption(option =>
            option
                .setName('tiempo')
                .setDescription('Tiempo en segundos (ej. 90) o mm:ss (ej. 1:30)')
                .setRequired(true)
        ),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        const current = player.queue.current;
        if (!current) {
            return interaction.reply('❌ No hay ninguna canción en reproducción.');
        }

        if (!current.length) {
            return interaction.reply('❌ No se puede hacer seek en streams en vivo o pistas sin duración fija.');
        }

        if (!current.isSeekable) {
            return interaction.reply('❌ Esta pista no admite seek.');
        }

        const raw = interaction.options.getString('tiempo', true);
        const positionMs = parseSeekInput(raw);
        if (positionMs === null || positionMs < 0) {
            return interaction.reply('❌ Tiempo inválido. Usá segundos (ej. `90`) o `mm:ss` / `h:mm:ss`.');
        }

        const duration = current.length;
        if (positionMs > duration) {
            return interaction.reply(`❌ La posición supera la duración del tema (${formatTime(duration)}).`);
        }

        try {
            await player.seek(positionMs);
        } catch (err) {
            return interaction.reply(`❌ No se pudo adelantar: ${err.message || 'error desconocido'}`);
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('⏩ Adelantado')
            .setDescription(`Posición: **${formatTime(positionMs)}** / ${formatTime(duration)}`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
