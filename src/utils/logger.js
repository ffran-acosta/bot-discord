import { mkdirSync } from 'fs';
import { createLogger, format, transports } from 'winston';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const logsDir = join(__dirname, '..', '..', 'logs');

try {
    mkdirSync(logsDir, { recursive: true });
} catch {
    // ignore
}

const levels = {
    error: 0,
    warn: 1,
    info: 2,
    debug: 3
};

const levelColors = {
    error: 'red',
    warn: 'yellow',
    info: 'green',
    debug: 'blue'
};

format.colorize().addColors(levelColors);

const logLevel = (process.env.LOG_LEVEL || 'info').toLowerCase();
const validLevels = Object.keys(levels);
const resolvedLevel = validLevels.includes(logLevel) ? logLevel : 'info';

function formatMetaConsole(meta) {
    const keys = Object.keys(meta);
    if (!keys.length) return '';

    const channelName = meta.channelName != null ? String(meta.channelName) : null;
    const channelId = meta.channelId != null ? String(meta.channelId) : null;
    const users = meta.users != null ? String(meta.users) : null;
    const guildId = meta.guildId != null ? String(meta.guildId) : null;
    const user = meta.user != null ? String(meta.user) : null;
    const query = meta.query != null ? String(meta.query) : null;

    const lines = [];

    if (channelName || channelId) {
        const idPart = channelId ? `#${channelId.slice(-6)}` : '';
        lines.push(`canal=${channelName ?? '?'}${idPart ? ` ${idPart}` : ''}`);
    }
    if (users) lines.push(`usuarios=${users}`);
    if (user) lines.push(`usr=${user}`);
    if (query) lines.push(`q=${query.length > 120 ? `${query.slice(0, 117)}…` : query}`);
    if (guildId) lines.push(`guild=${guildId}`);

    const restKeys = keys.filter(
        k =>
            !['channelName', 'channelId', 'users', 'guildId', 'user', 'query'].includes(k)
    );
    for (const k of restKeys) {
        const v = meta[k];
        if (v === undefined) continue;
        const s = typeof v === 'object' ? JSON.stringify(v) : String(v);
        lines.push(`${k}=${s.length > 80 ? `${s.slice(0, 77)}…` : s}`);
    }

    return lines.length ? `\n  ${lines.join('\n  ')}` : '';
}

const fileLineFormat = format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const body = stack || String(message);
    return `${timestamp} [${level}] ${body}${metaStr}`;
});

const consoleLineFormat = format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = formatMetaConsole(meta);
    const body = stack || String(message);
    return `${timestamp} [${level}] ${body}${metaStr}`;
});

const baseFileFormat = format.combine(
    format.timestamp({ format: () => new Date().toISOString() }),
    format.errors({ stack: true }),
    fileLineFormat
);

const consoleFormat = format.combine(
    format.timestamp({ format: () => new Date().toISOString() }),
    format.errors({ stack: true }),
    format.colorize({ all: true }),
    consoleLineFormat
);

const maxBytes = 5 * 1024 * 1024;
const maxFiles = 5;

const logger = createLogger({
    levels,
    level: resolvedLevel,
    transports: [
        new transports.Console({ format: consoleFormat }),
        new transports.File({
            filename: join(logsDir, 'error.log'),
            level: 'error',
            maxsize: maxBytes,
            maxFiles,
            format: baseFileFormat
        }),
        new transports.File({
            filename: join(logsDir, 'combined.log'),
            maxsize: maxBytes,
            maxFiles,
            format: baseFileFormat
        })
    ]
});

export default logger;
