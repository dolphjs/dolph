import { config } from 'dotenv';

config({});

export const configs = {
    NODE_ENV: process.env.NODE_ENV,
    PORT: +(process.env.PORT || 3300),
    MONGO_URL: process.env.MONGO_URL,
    SQL_URL: process.env.SQL_URL,
    SQL_USER: process.env.SQL_USER,
    SQL_PASSWORD: process.env.SQL_PASSWORD,
    SQL_HOST: process.env.SQL_HOST,
};

export const configLoader = () => {
    configs.NODE_ENV = process.env.NODE_ENV || 'development';
    configs.PORT = +(process.env.PORT || 3300);
    configs.MONGO_URL = process.env.MONGO_URL;
    configs.SQL_URL = process.env.SQL_URL;
    configs.SQL_USER = process.env.SQL_USER;
    configs.SQL_PASSWORD = process.env.SQL_PASSWORD;
    configs.SQL_HOST = process.env.SQL_HOST;
};
