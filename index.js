import { config } from 'dotenv';
import { Client, GatewayIntentBits, Collection } from 'discord.js';
import { Connectors } from 'shoukaku';
import { Kazagumo } from 'kazagumo';
import { readdirSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { fetchLavalinkNodes, primaryNode, fallbackNodes } from './src/config/lavalink.js';
import registerPlayerEndEvent from './src/events/playerEnd.js';
import registerPlayerExceptionEvent from './src/events/playerException.js';
import registerPlayerDestroyEvent from './src/events/playerDestroy.js';
import registerVoiceStateUpdateEvent from './src/events/voiceStateUpdate.js';
import registerShoukakuEvents from './src/events/shoukaku.js';
import { tryHandlePlayerButtons } from './src/events/buttonInteraction.js';
import { startHealthcheckServer } from './src/services/healthcheck.js';
import { saveQueues, restoreQueues } from './src/services/queuePersistence.js';
import logger from './src/utils/logger.js';

config();

if (!process.env.DISCORD_TOKEN) {
    logger.error('DISCORD_TOKEN no encontrado en las variables de entorno.');
    process.exit(1);
}

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const client = new Client({
    intents: [
        GatewayIntentBits.Guilds,
        GatewayIntentBits.GuildMessages,
        GatewayIntentBits.GuildVoiceStates,
        GatewayIntentBits.MessageContent
    ]
});

logger.info('Obteniendo nodos de Lavalink desde API pública...');
const apiNodes = await fetchLavalinkNodes();

const seenUrls = new Set();
const nodes = [primaryNode, ...apiNodes, ...fallbackNodes].filter(n => {
    if (seenUrls.has(n.url)) return false;
    seenUrls.add(n.url);
    return true;
});

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
        resumable: false,
        resumableTimeout: 30,
        reconnectTries: 2,
        reconnectInterval: 30000,
        restTimeout: 20000
    }
);

const shoukaku = kazagumo.shoukaku;

client.commands = new Collection();

const commandsPath = join(__dirname, 'commands');
const commandFiles = readdirSync(commandsPath).filter(file => file.endsWith('.js'));

for (const file of commandFiles) {
    const filePath = join(commandsPath, file);
    const command = await import(`file://${filePath}`);
    if ('default' in command && command.default.data) {
        client.commands.set(command.default.data.name, command.default);
    }
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
});

client.on('interactionCreate', async interaction => {
    if (await tryHandlePlayerButtons(interaction, kazagumo, client)) return;

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    try {
        await command.execute(interaction, kazagumo);
    } catch (error) {
        logger.error('Error ejecutando comando', { command: interaction.commandName, error: error.message, stack: error.stack });
        const reply = { content: '❌ Ocurrió un error al ejecutar el comando.', flags: 64 };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

process.on('unhandledRejection', (error) => {
    logger.error('Unhandled promise rejection', { error: error?.message, stack: error?.stack });
});

process.on('uncaughtException', (error) => {
    logger.error('Uncaught exception', { error: error?.message, stack: error?.stack });
});

let shuttingDown = false;
async function gracefulShutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info('Iniciando apagado graceful...');
    try {
        await saveQueues(kazagumo);
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
    await new Promise(resolve => {
        if (healthcheckServer?.listening) {
            healthcheckServer.close(() => resolve());
        } else {
            resolve();
        }
    });
    logger.info('Apagado graceful completado');
    process.exit(0);
}

process.on('SIGINT', () => { void gracefulShutdown(); });
process.on('SIGTERM', () => { void gracefulShutdown(); });

client.login(process.env.DISCORD_TOKEN).catch(error => {
    logger.error('Error al iniciar sesión', { error: error.message });
    process.exit(1);
});
