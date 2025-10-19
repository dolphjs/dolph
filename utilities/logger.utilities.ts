import winston from 'winston';
import clc from 'cli-color';
import { formatDate } from './formatters/format_date.utilities';

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
            const formattedTimestamp = clc.white(formatDate(timestamp));
            let formattedLevel: string;

            let newMessage: string = message;

            if (level === 'info') {
                formattedLevel = clc.blue(`[${level.toUpperCase()}]`);
            } else if (level === 'warn') {
                formattedLevel = clc.yellow(`[${level.toUpperCase()}]`);
                newMessage = clc.yellowBright(message);
            } else if (level === 'debug') {
                formattedLevel = clc.green(`[${level.toUpperCase()}]`);
                newMessage = clc.greenBright(message);
            } else if (level === 'error') {
                formattedLevel = clc.red(`[${level.toUpperCase()}]`);
                newMessage = clc.redBright(message);
            }

            let logMessage = `${formattedLevel}: ${formattedTimestamp} ${newMessage}`;

            if (stack) {
                logMessage += `\n${stack}`;
            }

            return logMessage;
        }),
    ),

    transports: [new winston.transports.Console({ level: 'debug' })],
});

const emojiForLevel = {
    info: '🔹',
    warn: '⚠️',
    debug: '🐛',
    error: '❗️',
};

// const componentEmoji = {
//   route: '🌐',
//   shield: '🛡️',
//   middleware: '🛡️',
// };

const inAppLogger = winston.createLogger({
    levels: {
        error: 0,
        warn: 1,
        info: 2,
        debug: 3,
    },
    format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.printf((info) => {
            const { timestamp, level, message } = info;
            const formattedTimestamp = formatDate(timestamp);
            const logEmoji = emojiForLevel[level] || '🔹';
            let formattedMessage = message;

            let levelLog = `${clc.blue([`${level.toUpperCase()}`])}`;
            if (level === 'warn') {
                levelLog = `${clc.yellow([`${level}`])}`;
            } else if (level === 'debug') {
                levelLog = `${clc.cyan([`${level}`])}`;
            } else if (level === 'error') {
                levelLog = `${clc.red([`${level}`])}`;
            }

            if (message.startsWith('Registered')) {
                // Split the message to extract the relevant parts
                const [action, componentDetails] = message.split('>>>>').map((part) => part.trim());

                // Determine the component type based on the presence of specific keywords
                // const componentType = componentDetails.includes('Middleware')
                //   ? 'middleware'
                //   : componentDetails.includes('Shield')
                //   ? 'shield'
                //   : 'route'; // Default to 'route' if neither Middleware nor Shield is found

                // Construct the formatted message
                formattedMessage = `${logEmoji} [${formattedTimestamp}] ${levelLog}: ${clc.blueBright(
                    `${action}`,
                )} ${clc.blueBright(`>>>> ${componentDetails}`)}`;
            } else {
                formattedMessage = `${logEmoji} [${formattedTimestamp}] ${levelLog}: ${formattedMessage}`;
            }

            return formattedMessage;
        }),
    ),
    transports: [new winston.transports.Console({ level: 'debug' })],
});

export { logger, inAppLogger };
