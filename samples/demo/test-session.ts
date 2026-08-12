import { DolphFactory } from '../../core';
import session from 'express-session';
import { AppController } from './app.controller';

const dolph = new DolphFactory([]); // empty routes for test

// Try the user's snippet
try {
  //@ts-ignore - to see if it exists
  dolph.app.use(
    session({
      secret: 'my-super-secret-key',
      resave: false,
      saveUninitialized: false,
    })
  );
  console.log("dolph.app works");
} catch (e) {
  console.log("dolph.app failed:", e.message);
}

try {
  dolph.engine().use(
    session({
      secret: 'my-super-secret-key',
      resave: false,
      saveUninitialized: false,
    })
  );
  console.log("dolph.engine() works");
} catch(e) {
  console.log("dolph.engine() failed:", e.message);
}

// Exit immediately
process.exit(0);
