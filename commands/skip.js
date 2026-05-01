import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import logger from '../src/utils/logger.js';
import { isAutoplay } from '../src/services/playerState.js';

export default {
    data: new SlashCommandBuilder()
        .setName('saltar')
        .setDescription('Salta a la siguiente canción'),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        if (!player.queue.current) {
            return interaction.reply('❌ No hay ninguna canción en reproducción.');
        }

        const currentTrack = player.queue.current;
        const nextTrack = player.queue[0] ?? null;
        const guildId = interaction.guild.id;

        logger.info('Saltar', { guildId, omitido: currentTrack.title, siguiente: nextTrack?.title ?? 'nada' });

        await player.skip();

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('⏭️ Canción saltada')
            .setDescription(`Se saltó: **${currentTrack.title}**`)
            .setTimestamp();

        if (nextTrack) {
            embed.addFields({ name: '🎵 Siguiente', value: `**${nextTrack.title}**`, inline: false });
        } else if (isAutoplay(guildId)) {
            embed.addFields({ name: '🔄 Auto-reproducir', value: 'Buscando un tema relacionado…', inline: false });
        } else {
            embed.setDescription(`Se saltó: **${currentTrack.title}**\n\n❌ No hay más temas en la cola.`);
        }

        await interaction.reply({ embeds: [embed] });
    }
};
