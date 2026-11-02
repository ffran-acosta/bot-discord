import { readdirSync } from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath, pathToFileURL } from 'url';

const commandsPath = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'commands');

/**
 * @typedef {{ data: import('discord.js').SlashCommandBuilder, execute: (interaction: import('discord.js').ChatInputCommandInteraction, kazagumo: import('kazagumo').Kazagumo) => Promise<unknown> }} Command
 */

/**
 * Importa los slash commands de `commands/*.js`.
 * @returns {Promise<Command[]>}
 */
export async function loadCommands() {
    const files = readdirSync(commandsPath).filter(file => file.endsWith('.js'));
    const commands = [];
    for (const file of files) {
        const mod = await import(pathToFileURL(join(commandsPath, file)).href);
        if (mod.default?.data) commands.push(mod.default);
    }
    return commands;
}
