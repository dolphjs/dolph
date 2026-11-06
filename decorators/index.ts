import { Service, Container } from 'typedi';

export * from './mongoose';
export * from './dolph';
export * from './spring';
export * from './sockets';
export * from './events';

export { Service as DService, Container as DContainer };
