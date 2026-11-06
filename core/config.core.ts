import { config } from 'dotenv';

config({});

/**
 * Development mode exposes error details, so it has to be asked for explicitly,
 * and a non-development value from either source wins. That way a forgotten
 * NODE_ENV, or `env: development` left in a deployed dolph_config.yaml, can't
 * turn off production protections.
 */
export const resolveNodeEnv = (configEnv?: string): string => {
    const declared = [process.env.NODE_ENV, configEnv].filter(Boolean);

    return declared.find((env) => env !== 'development') ?? (declared.length ? 'development' : 'production');
};

export const configs = {
    NODE_ENV: resolveNodeEnv(),
    PORT: +(process.env.PORT || 3300),
    MONGO_URL: process.env.MONGO_URL,
    SQL_URL: process.env.SQL_URL,
    SQL_USER: process.env.SQL_USER,
    SQL_PASSWORD: process.env.SQL_PASSWORD,
    SQL_HOST: process.env.SQL_HOST,
};

export const configLoader = (configEnv?: string) => {
    configs.NODE_ENV = resolveNodeEnv(configEnv);
    configs.PORT = +(process.env.PORT || 3300);
    configs.MONGO_URL = process.env.MONGO_URL;
    configs.SQL_URL = process.env.SQL_URL;
    configs.SQL_USER = process.env.SQL_USER;
    configs.SQL_PASSWORD = process.env.SQL_PASSWORD;
    configs.SQL_HOST = process.env.SQL_HOST;
};
