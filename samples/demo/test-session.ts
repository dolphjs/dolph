import { DolphFactory } from '../../core';
import session from 'express-session';

const dolph = new DolphFactory([], {
    middlewares: [
        session({
            secret: 'my-super-secret-key',
            resave: false,
            saveUninitialized: false,
        }),
    ],
});

dolph.engine();
console.log('the middlewares option works');

// Exit immediately
process.exit(0);
