import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import logger from '../src/utils/logger.js';
import { setAutoplay, setAutoplayContext } from '../src/services/playerState.js';

export default {
    data: new SlashCommandBuilder()
        .setName('auto-reproducir')
        .setDescription('Activa o desactiva la reproducción automática de temas relacionados')
        .addStringOption(option =>
            option.setName('modo')
                .setDescription('Activar o desactivar la reproducción automática')
                .setRequired(true)
                .addChoices(
                    { name: 'Activar', value: 'on' },
                    { name: 'Desactivar', value: 'off' }
                )),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        const mode = interaction.options.getString('modo');
        const isEnabled = mode === 'on';
        const guildId = interaction.guild.id;

        setAutoplay(guildId, isEnabled);

        if (isEnabled && player.queue.current) {
            setAutoplayContext(guildId, player.queue.current);
        }

        const embed = new EmbedBuilder()
            .setColor(isEnabled ? 0x57F287 : 0xED4245)
            .setTitle(
                isEnabled ? '🔄 Reproducción automática activada' : '⏹️ Reproducción automática desactivada'
            )
            .setDescription(
                isEnabled
                    ? 'El bot reproducirá temas relacionados cuando la cola termine.\n\nUsá **`/reproducir`** para agregar música manualmente o **`/auto-reproducir`** con **Desactivar** para apagar.'
                    : 'El bot ya no elegirá temas solos al terminar la cola.'
            )
            .setTimestamp();

        logger.info(`Auto-reproducir ${isEnabled ? 'activado' : 'desactivado'}`, { guildId, user: interaction.user.tag });

        await interaction.reply({ embeds: [embed] });
    }
};
