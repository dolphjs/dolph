import { DolphFactory } from '../../core';
import session from 'express-session';
import { AppController } from './app.controller';

const dolph = new DolphFactory([]); // empty routes for test

dolph.middlewares([
  session({
    secret: 'my-super-secret-key',
    resave: false,
    saveUninitialized: false,
  }),
]);
console.log("dolph.middlewares() works");

// Exit immediately
process.exit(0);
