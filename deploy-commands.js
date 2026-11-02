import { REST, Routes } from 'discord.js';
import { config } from 'dotenv';
import { loadCommands } from './src/utils/loadCommands.js';

config();

const commands = [];
for (const command of await loadCommands()) {
    commands.push(command.data.toJSON());
    console.log(`✅ Command loaded: ${command.data.name}`);
}

// Create REST instance
const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);

// Function to get Client ID from token
async function getClientId() {
    // First try from environment variables
    if (process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID) {
        return process.env.DISCORD_CLIENT_ID || process.env.CLIENT_ID;
    }
    
    // Get Client ID from Discord API using the token
    try {
        const response = await fetch('https://discord.com/api/v10/oauth2/@me', {
            headers: {
                'Authorization': `Bot ${process.env.DISCORD_TOKEN}`
            }
        });
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        
        if (data.application?.id) {
            return data.application.id;
        } else {
            throw new Error('application.id not found in response');
        }
    } catch (error) {
        console.error('❌ Could not get Client ID automatically.');
        console.error(`   Error: ${error.message}`);
        console.error('\n💡 Solution: Add DISCORD_CLIENT_ID to your .env file');
        console.error('   1. Go to: https://discord.com/developers/applications');
        console.error('   2. Select your application');
        console.error('   3. Copy the "Application ID"');
        console.error('   4. Add it to your .env as: DISCORD_CLIENT_ID=your_id_here\n');
        throw error;
    }
}

// Function to register commands
async function deployCommands() {
    try {
        const clientId = await getClientId();
        console.log(`🔄 Registering ${commands.length} slash commands...`);
        console.log(`📱 Client ID: ${clientId}`);

        // If there's a GUILD_ID in environment variables, use server commands (faster)
        // If not, use global commands (can take up to 1 hour)
        const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
        
        let data;
        if (guildId) {
            console.log(`🏠 Using SERVER commands (appear immediately)`);
            console.log(`   Server ID: ${guildId}`);
            try {
                data = await rest.put(
                    Routes.applicationGuildCommands(clientId, guildId),
                    { body: commands }
                );
                console.log(`✅ Successfully registered ${data.length} slash commands on the server!`);
            } catch (guildError) {
                // If server registration fails (e.g., Missing Access), fallback to global
                if (guildError.code === 50001 || guildError.code === 50013) {
                    console.warn(`⚠️  Server registration failed (Missing Access). Falling back to global commands...`);
                    console.log(`🌍 Using GLOBAL commands (can take up to 1 hour to appear)`);
                    data = await rest.put(
                        Routes.applicationCommands(clientId),
                        { body: commands }
                    );
                    console.log(`✅ Successfully registered ${data.length} slash commands globally!`);
                } else {
                    throw guildError; // Re-throw if it's a different error
                }
            }
        } else {
            console.log(`🌍 Using GLOBAL commands (can take up to 1 hour to appear)`);
            console.log(`💡 Tip: Add GUILD_ID to your .env for instant commands`);
            data = await rest.put(
                Routes.applicationCommands(clientId),
                { body: commands }
            );
            console.log(`✅ Successfully registered ${data.length} slash commands globally!`);
        }

        console.log(`\n📝 Registered commands:`);
        data.forEach(cmd => console.log(`   - /${cmd.name}`));
        
        if (!guildId) {
            console.log(`\n⏰ Note: Global commands can take up to 1 hour to appear.`);
            console.log(`   For instant commands, add GUILD_ID to your .env file`);
        }
    } catch (error) {
        console.error('❌ Error registering commands:', error);
        if (error.code === 50035) {
            console.error('\n💡 Possible solutions:');
            console.error('   1. Verify that the token is correct');
            console.error('   2. Verify that the bot is invited to the server (if using GUILD_ID)');
            console.error('   3. Verify that GUILD_ID is correct');
        }
    }
}

// Execute
deployCommands();
