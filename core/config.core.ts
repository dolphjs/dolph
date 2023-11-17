import { config } from 'dotenv';

config({});

export const configs = {
  NODE_ENV: process.env.NODE_ENV,
  PORT: +process.env.PORT,
};

export const configLoader = () => {
  configs.NODE_ENV = process.env.NODE_ENV || 'development';
  configs.PORT = +process.env.PORT || 3300;
};
