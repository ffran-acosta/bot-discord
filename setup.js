import { readFileSync, writeFileSync, existsSync } from 'fs';
import { execSync } from 'child_process';
import { config } from 'dotenv';

config();

console.log('🚀 Discord Music Bot - Initial Setup\n');
console.log('═'.repeat(50));
console.log('');

// Verify Node.js
console.log('📋 Verifying requirements...\n');

try {
    const nodeVersion = execSync('node --version', { encoding: 'utf-8' }).trim();
    const majorVersion = parseInt(nodeVersion.replace('v', '').split('.')[0]);
    
    if (majorVersion < 18) {
        console.error('❌ Node.js version 18 or higher required');
        console.error(`   Current version: ${nodeVersion}`);
        console.error('   Download Node.js from: https://nodejs.org/\n');
        process.exit(1);
    }
    
    console.log(`✅ Node.js: ${nodeVersion}`);
} catch (error) {
    console.error('❌ Node.js is not installed');
    console.error('   Download Node.js from: https://nodejs.org/\n');
    process.exit(1);
}

// Verify pnpm
try {
    const pnpmVersion = execSync('pnpm --version', { encoding: 'utf-8' }).trim();
    console.log(`✅ pnpm: ${pnpmVersion}`);
} catch (error) {
    console.error('❌ pnpm is not installed\n');
    console.error('   Install: corepack enable && corepack prepare pnpm@latest --activate\n');
    console.error('   Or: https://pnpm.io/installation\n');
    process.exit(1);
}

console.log('');

// Verify dependencies
console.log('📦 Verifying dependencies...\n');

if (!existsSync('node_modules')) {
    console.log('📥 Installing dependencies...');
    try {
        execSync('pnpm install', { stdio: 'inherit' });
        console.log('✅ Dependencies installed\n');
    } catch (error) {
        console.error('❌ Error installing dependencies\n');
        process.exit(1);
    }
} else {
    console.log('✅ node_modules found\n');
}

// Verify .env file
console.log('⚙️  Verifying configuration...\n');

const envPath = '.env';
let envContent = '';
let needsSetup = false;

if (existsSync(envPath)) {
    envContent = readFileSync(envPath, 'utf-8');
    console.log('✅ .env file found');
} else {
    console.log('⚠️  .env file not found, creating a new one...');
    needsSetup = true;
}

// Verify required variables
const requiredVars = {
    'DISCORD_TOKEN': 'Discord bot token',
    'LAVALINK_URL': 'Lavalink server URL (e.g., host:port)',
    'LAVALINK_PASSWORD': 'Lavalink password'
};

const optionalVars = {
    'DISCORD_CLIENT_ID': 'Bot Application ID (optional, obtained automatically)',
    'GUILD_ID': 'Server ID for instant commands (optional)',
    'LAVALINK_SECURE': 'true/false for secure connection (automatically detected if port is 443)'
};

let missingVars = [];

for (const [varName, description] of Object.entries(requiredVars)) {
    if (!envContent.includes(`${varName}=`)) {
        missingVars.push({ name: varName, description });
        needsSetup = true;
    }
}

if (missingVars.length > 0) {
    console.log('\n❌ Missing variables in .env:\n');
    missingVars.forEach(({ name, description }) => {
        console.log(`   - ${name}: ${description}`);
    });
    console.log('\n💡 Please complete the .env file with the required variables');
    console.log('   You can use .env.example as reference\n');
} else {
    console.log('✅ All required variables are configured\n');
}

// Verify commands
console.log('📁 Verifying file structure...\n');

const requiredFiles = [
    'index.js',
    'deploy-commands.js',
    'commands/play.js',
    'commands/stop.js',
    'commands/skip.js'
];

let missingFiles = [];

for (const file of requiredFiles) {
    if (!existsSync(file)) {
        missingFiles.push(file);
    }
}

if (missingFiles.length > 0) {
    console.log('❌ Missing files:\n');
    missingFiles.forEach(file => console.log(`   - ${file}`));
    console.log('');
    process.exit(1);
} else {
    console.log('✅ All necessary files are present\n');
}

// Summary
console.log('═'.repeat(50));
console.log('');

if (needsSetup) {
    console.log('⚠️  Incomplete configuration\n');
    console.log('📝 Next steps:');
    console.log('   1. Complete the .env file with the required variables');
    console.log('   2. Run: pnpm run deploy (to register commands)');
    console.log('   3. Run: pnpm start (to start the bot)\n');
    console.log('📖 Read README.md for detailed instructions\n');
    process.exit(0);
} else {
    console.log('✅ Everything is configured correctly!\n');
    console.log('📝 Next steps:');
    console.log('   1. Run: pnpm run deploy (to register commands)');
    console.log('   2. Run: pnpm start (to start the bot)\n');
    console.log('🎉 Ready to use!\n');
}
