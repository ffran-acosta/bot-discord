import { config } from 'dotenv';
import { Client, GatewayIntentBits, Collection, MessageFlags } from 'discord.js';
import { Connectors } from 'shoukaku';
import { Kazagumo } from 'kazagumo';
import { buildNodeOptions } from './src/config/lavalink.js';
import {
    LAVALINK_RECONNECT_INTERVAL_MS,
    LAVALINK_RECONNECT_TRIES,
    LAVALINK_REST_TIMEOUT_MS,
    QUEUE_SAVE_INTERVAL_MS
} from './src/config/constants.js';
import { startLavalinkPoolMaintenance } from './src/services/lavalinkPool.js';
import registerPlayerEndEvent from './src/events/playerEnd.js';
import registerPlayerExceptionEvent from './src/events/playerException.js';
import registerPlayerDestroyEvent from './src/events/playerDestroy.js';
import registerVoiceStateUpdateEvent from './src/events/voiceStateUpdate.js';
import registerShoukakuEvents from './src/events/shoukaku.js';
import { tryHandlePlayerButtons } from './src/events/buttonInteraction.js';
import { startHealthcheckServer } from './src/services/healthcheck.js';
import { saveQueues, restoreQueues } from './src/services/queuePersistence.js';
import { loadCommands } from './src/utils/loadCommands.js';
import logger from './src/utils/logger.js';

config();

if (!process.env.DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN no encontrado en las variables de entorno.');
    process.exit(1);
}

// Solo slash commands y voz: no hacen falta GuildMessages ni MessageContent (privilegiado).
const client = new Client({
    intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildVoiceStates]
});

logger.info('Obteniendo nodos de Lavalink desde API pública...');
const nodes = await buildNodeOptions();

logger.info(`Nodos de Lavalink listos (${nodes.length} total)`);
nodes.forEach((n, i) => logger.info(`  ${i + 1}. ${n.url}  [${n.name}]`));

const connector = new Connectors.DiscordJS(client);

const kazagumo = new Kazagumo(
    {
        defaultSearchEngine: 'youtube',
        send: (guildId, payload) => {
            const guild = client.guilds.cache.get(guildId);
            if (guild) guild.shard.send(payload);
        }
    },
    connector,
    nodes,
    {
        moveOnDisconnect: true,
        reconnectTries: LAVALINK_RECONNECT_TRIES,
        reconnectInterval: LAVALINK_RECONNECT_INTERVAL_MS,
        restTimeout: LAVALINK_REST_TIMEOUT_MS
    }
);

const shoukaku = kazagumo.shoukaku;

startLavalinkPoolMaintenance(kazagumo, nodes);

/** @type {Collection<string, import('./src/utils/loadCommands.js').Command>} */
const commands = new Collection();
for (const command of await loadCommands()) {
    commands.set(command.data.name, command);
}

registerShoukakuEvents(shoukaku);
registerPlayerEndEvent(kazagumo, client);
registerPlayerExceptionEvent(kazagumo);
registerPlayerDestroyEvent(kazagumo, client);
registerVoiceStateUpdateEvent(client, kazagumo);
const healthcheckServer = startHealthcheckServer(client, kazagumo);

client.once('ready', async () => {
    logger.info(`Bot conectado como ${client.user.tag}`);
    logger.info(`Servidores: ${client.guilds.cache.size}`);
    await restoreQueues(kazagumo, client);

    setInterval(() => {
        saveQueues(kazagumo).catch(err => logger.error('Error en guardado periódico de colas', { error: err.message }));
    }, QUEUE_SAVE_INTERVAL_MS);
});

client.on('interactionCreate', async interaction => {
    if (await tryHandlePlayerButtons(interaction, kazagumo, client)) return;

    if (!interaction.isChatInputCommand()) return;

    const command = commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, kazagumo);
    } catch (error) {
        logger.error('Error ejecutando comando', {
            command: interaction.commandName,
            error: error.message,
            stack: error.stack
        });
        /** @type {import('discord.js').InteractionReplyOptions} */
        const reply = { content: '❌ Ocurrió un error al ejecutar el comando.', flags: MessageFlags.Ephemeral };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

let shuttingDown = false;

/**
 * Guarda las colas, destruye los players y sale.
 * @param {number} exitCode
 */
async function gracefulShutdown(exitCode) {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Iniciando apagado graceful...');
    try {
        await saveQueues(kazagumo);
        logger.info('Colas guardadas');
    } catch (err) {
        logger.error('Error guardando colas', { error: err.message });
    }
    for (const player of kazagumo.players.values()) {
        try {
            await player.destroy();
        } catch (err) {
            logger.error(`Error destruyendo player ${player.guildId}`, { error: err.message });
        }
    }
    client.destroy();
    await /** @type {Promise<void>} */ (
        new Promise(resolve => {
        if (healthcheckServer?.listening) {
            healthcheckServer.close(() => resolve());
        } else {
            resolve();
        }
        })
    );
    logger.info('Apagado graceful completado');
    process.exit(exitCode);
}

process.on('unhandledRejection', (/** @type {any} */ error) => {
    logger.error('Unhandled promise rejection', { error: error?.message, stack: error?.stack });
});

// Tras una excepción no capturada el proceso queda en estado indefinido: guardar y salir; pm2 reinicia
// y la cola se restaura al arrancar.
process.on('uncaughtException', error => {
    logger.error('Uncaught exception', { error: error?.message, stack: error?.stack });
    void gracefulShutdown(1);
});

process.on('SIGINT', () => {
    void gracefulShutdown(0);
});
process.on('SIGTERM', () => {
    void gracefulShutdown(0);
});

client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.error('Error al iniciar sesión', { error: error.message });
    process.exit(1);
});
