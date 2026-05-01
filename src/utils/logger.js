import { config } from 'dotenv';
import { mkdirSync } from 'fs';
import { createLogger, format, transports } from 'winston';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

config();

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

const lineFormat = format.printf(({ level, message, timestamp, stack, ...meta }) => {
    const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
    const body = stack || String(message);
    return `${timestamp} [${level}] ${body}${metaStr}`;
});

const baseFileFormat = format.combine(
    format.timestamp({ format: () => new Date().toISOString() }),
    format.errors({ stack: true }),
    lineFormat
);

const consoleFormat = format.combine(
    format.timestamp({ format: () => new Date().toISOString() }),
    format.errors({ stack: true }),
    format.colorize({ all: true }),
    lineFormat
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
