import { SlashCommandBuilder, EmbedBuilder } from 'discord.js';
import { formatBytes, formatUptime, getBotStats } from '../src/services/stats.js';

export default {
    data: new SlashCommandBuilder()
        .setName('stats')
        .setDescription('Estadísticas del bot (uptime, servidores, reproducciones, nodos, memoria)'),

    async execute(interaction, kazagumo) {
        const s = getBotStats(interaction.client, kazagumo);

        const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 Estadísticas')
            .addFields(
                { name: 'Uptime', value: formatUptime(s.uptimeMs), inline: true },
                { name: 'Servidores', value: `${s.guilds}`, inline: true },
                { name: 'Canciones reproducidas', value: `${s.songsPlayed}`, inline: true },
                {
                    name: 'Lavalink',
                    value: `${s.lavalinkConnected}/${s.lavalinkTotal} nodos conectados`,
                    inline: true
                },
                { name: 'Memoria RSS', value: formatBytes(s.rssBytes), inline: true },
                { name: 'Heap usado', value: formatBytes(s.heapUsedBytes), inline: true }
            )
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    }
};
