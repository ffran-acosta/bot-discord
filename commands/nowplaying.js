import { MessageFlags, SlashCommandBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import { syncNowPlayingPanel } from '../src/services/nowPlayingMessage.js';

export default {
    data: new SlashCommandBuilder()
        .setName('nowplaying')
        .setDescription('Muestra el panel de reproducción con controles en este canal'),

    async execute(interaction, kazagumo) {
        const guard = await requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        await interaction.deferReply({ flags: MessageFlags.Ephemeral });

        player.setTextChannel(interaction.channel.id);
        const panelMsg = await syncNowPlayingPanel(interaction.client, kazagumo, player);
        if (!panelMsg) {
            return interaction.editReply(
                '❌ No se pudo publicar el panel en este canal (¿permisos o canal inválido?).'
            );
        }

        return interaction.editReply('Panel de reproducción');
    }
};
