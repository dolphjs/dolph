import winston from 'winston';
import clc from 'cli-color';
import { formatDate } from './formatters/format_date.utilities';

type DolphLogLevel = 'error' | 'warn' | 'info' | 'debug';

// Nest labels its "info" level as LOG — matched here since that's the
// convention this format is modelled on.
const levelLabels: Record<DolphLogLevel, string> = {
    error: 'ERROR',
    warn: 'WARN',
    info: 'LOG',
    debug: 'DEBUG',
};

const levelColors: Record<DolphLogLevel, (text: string) => string> = {
    error: clc.red,
    warn: clc.yellow,
    info: clc.green,
    debug: clc.magenta,
};

const longestLabelLength = Math.max(...Object.values(levelLabels).map((label) => label.length));

// Time since the previous log line, printed as `+Nms` — the running
// duration hint Nest's console logger prints after every line.
let lastLogAt = Date.now();

const logger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
            const { timestamp, level, message, stack } = info;
            const dolphLevel = level as DolphLogLevel;

            const now = Date.now();
            const sinceLastLog = now - lastLogAt;
            lastLogAt = now;

            const color = levelColors[dolphLevel] ?? clc.white;
            const label = color((levelLabels[dolphLevel] ?? level.toUpperCase()).padEnd(longestLabelLength));
            const formattedTimestamp = formatDate(timestamp as Date);

            // Only tint the message body for the levels that need to stand
            // out at a glance — LOG stays the terminal's default color,
            // same as Nest.
            const body = dolphLevel === 'info' ? message : color(message as string);

            let line = `${clc.bold(clc.green('[Dolph]'))} ${clc.green(String(process.pid))}  - ${formattedTimestamp}   ${label} ${body} ${clc.blackBright(`+${sinceLastLog}ms`)}`;

            if (stack) {
                line += `\n${stack}`;
            }

            return line;
        }),
    ),

    transports: [new winston.transports.Console({ level: 'debug' })],
});

// Both names are kept so existing call sites (logger.*, inAppLogger.*)
// don't need to change — they were previously two loggers with visibly
// different formats (one plain, one emoji-prefixed), which is the
// inconsistency this unification fixes.
const inAppLogger = logger;

export { logger, inAppLogger };
