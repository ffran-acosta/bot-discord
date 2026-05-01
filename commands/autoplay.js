import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import logger from '../src/utils/logger.js';
import { setAutoplay, setAutoplayContext } from '../src/services/playerState.js';

export default {
    data: new SlashCommandBuilder()
        .setName('autoplay')
        .setDescription('Activa o desactiva la reproducción automática de temas relacionados')
        .addStringOption(option =>
            option.setName('mode')
                .setDescription('Activar o desactivar autoplay')
                .setRequired(true)
                .addChoices(
                    { name: 'Activar', value: 'on' },
                    { name: 'Desactivar', value: 'off' }
                )),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        const mode = interaction.options.getString('mode');
        const isEnabled = mode === 'on';
        const guildId = interaction.guild.id;

        setAutoplay(guildId, isEnabled);

        if (isEnabled && player.queue.current) {
            setAutoplayContext(guildId, player.queue.current);
        }

        const embed = new EmbedBuilder()
            .setColor(isEnabled ? 0x57F287 : 0xED4245)
            .setTitle(isEnabled ? '🔄 Autoplay activado' : '⏹️ Autoplay desactivado')
            .setDescription(
                isEnabled
                    ? 'El bot reproducirá temas relacionados cuando la cola termine.\n\nUsá `/play` para agregar música manualmente o `/autoplay` con Desactivar para apagar.'
                    : 'El bot ya no elegirá temas solos al terminar la cola.'
            )
            .setTimestamp();

        logger.info(`Autoplay ${isEnabled ? 'activado' : 'desactivado'}`, { guildId, user: interaction.user.tag });

        await interaction.reply({ embeds: [embed] });
    }
};
