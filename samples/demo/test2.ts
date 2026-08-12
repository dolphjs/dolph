import { DolphFactory } from '../../core';

const dolph = new DolphFactory([]);

let appWorked = false;
let engineWorked = false;

try {
  //@ts-ignore
  if (dolph.app !== undefined && typeof dolph.app.use === 'function') {
    appWorked = true;
  }
} catch (e) {
}

try {
  if (dolph.engine() !== undefined && typeof dolph.engine().use === 'function') {
    engineWorked = true;
  }
} catch (e) {
}

console.log(JSON.stringify({ appWorked, engineWorked }));
process.exit(0);
