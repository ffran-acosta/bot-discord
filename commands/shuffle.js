import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import logger from '../src/utils/logger.js';

export default {
    data: new SlashCommandBuilder()
        .setName('aleatorio')
        .setDescription('Mezcla el orden de los temas en la cola'),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        if (player.queue.length === 0) {
            return interaction.reply('❌ No hay temas en la cola para mezclar (la pista actual sigue igual).');
        }

        if (typeof player.queue.shuffle === 'function') {
            player.queue.shuffle();
        } else {
            const tracks = player.queue;
            for (let i = tracks.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [tracks[i], tracks[j]] = [tracks[j], tracks[i]];
            }
        }

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔀 Cola mezclada')
            .setDescription(`Se mezclaron **${player.queue.length}** tema(s) en la cola.`)
            .addFields(
                { name: '🎵 Ahora', value: player.queue.current?.title ?? '—', inline: false }
            )
            .setTimestamp();

        logger.info('Aleatorio', { guildId: interaction.guild.id, user: interaction.user.tag, queueSize: player.queue.length });

        await interaction.reply({ embeds: [embed] });
    }
};
