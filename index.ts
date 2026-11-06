import * as common from './common';
import * as classes from './classes';
import * as decorators from './decorators';
import * as packages from './packages';
import * as utilities from './utilities';

import 'reflect-metadata';

export { common, classes, decorators, packages, utilities };
export * from './core';
export * from './common';
export * from './classes';
export * from './decorators';
export * from './packages';
export * from './utilities';

// In both common and decorators, and `export *` silently drops a name that two
// modules export. The decorators version is the current one.
export { TryCatchAsyncDec } from './decorators';
