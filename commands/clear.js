import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';

export default {
    data: new SlashCommandBuilder()
        .setName('clear')
        .setDescription('Vacía la cola (la pista actual sigue sonando)'),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        const removed = player.queue.length;
        player.queue.clear();

        const embed = new EmbedBuilder()
            .setColor(0xED4245)
            .setTitle('🗑️ Cola vaciada')
            .setDescription(
                removed > 0
                    ? `Se sacaron **${removed}** tema(s) de la cola.`
                    : 'La cola ya estaba vacía.'
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
