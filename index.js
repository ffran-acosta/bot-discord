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
import { saveQueues, restoreQueues } from './src/services/queuePersistence.js';

config();

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

console.log(`🔍 Fetching Lavalink nodes from public API...`);
const apiNodes = await fetchLavalinkNodes();

const seenUrls = new Set();
const nodes = [primaryNode, ...apiNodes, ...fallbackNodes].filter(n => {
    if (seenUrls.has(n.url)) return false;
    seenUrls.add(n.url);
    return true;
});

console.log(`🎵 Lavalink nodes ready (${nodes.length} total):`);
nodes.forEach((n, i) => console.log(`   ${i + 1}. ${n.url}  [${n.name}]`));

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

client.once('ready', () => {
    console.log(`🤖 Bot connected as ${client.user.tag}!`);
    console.log(`📊 Servers: ${client.guilds.cache.size}`);
});

client.once('clientReady', async () => {
    console.log(`✅ Client fully ready!`);
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
        console.error('Error executing command:', error);
        const reply = {
            content: '❌ There was an error executing this command!',
            flags: 64
        };
        if (interaction.replied || interaction.deferred) {
            await interaction.followUp(reply);
        } else {
            await interaction.reply(reply);
        }
    }
});

process.on('unhandledRejection', (error, promise) => {
    console.error('Unhandled promise rejection:', error);
    if (error.stack) {
        console.error('Stack trace:', error.stack);
    }
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught exception:', error);
    if (error.stack) {
        console.error('Stack trace:', error.stack);
    }
});

let shuttingDown = false;
async function gracefulShutdown() {
    if (shuttingDown) return;
    shuttingDown = true;
    console.log('\n🛑 Closing bot...');
    try {
        await saveQueues(kazagumo);
    } catch (err) {
        console.error('Error saving queues:', err);
    }
    client.destroy();
    process.exit(0);
}

process.on('SIGINT', () => {
    void gracefulShutdown();
});

process.on('SIGTERM', () => {
    void gracefulShutdown();
});

if (!process.env.DISCORD_TOKEN) {
    console.error('❌ DISCORD_TOKEN not found in environment variables!');
    console.error('💡 Make sure to configure DISCORD_TOKEN in your Wispbyte panel');
    process.exit(1);
}

client.login(process.env.DISCORD_TOKEN).catch(error => {
    console.error('❌ Error logging in:', error.message);
    console.error('💡 Verify that DISCORD_TOKEN is correct');
    process.exit(1);
});
