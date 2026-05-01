import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { requirePlayerInVoice } from '../src/middleware/guards.js';
import { setLoopMode } from '../src/services/playerState.js';

export default {
    data: new SlashCommandBuilder()
        .setName('loop')
        .setDescription('Configura el modo de repetición de la cola')
        .addStringOption(option =>
            option
                .setName('mode')
                .setDescription('Modo de repetición')
                .setRequired(true)
                .addChoices(
                    { name: 'Apagado', value: 'off' },
                    { name: 'Pista actual', value: 'track' },
                    { name: 'Cola completa', value: 'queue' }
                )
        ),

    async execute(interaction, kazagumo) {
        const guard = requirePlayerInVoice(interaction, kazagumo);
        if (!guard) return;
        const { player } = guard;

        const mode = interaction.options.getString('mode', true);
        setLoopMode(interaction.guild.id, mode);
        player.setLoop('none');

        const labels = { off: 'Apagado', track: 'Pista actual', queue: 'Cola completa' };
        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('🔁 Modo repetición')
            .setDescription(`Configurado en **${labels[mode]}**`)
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
