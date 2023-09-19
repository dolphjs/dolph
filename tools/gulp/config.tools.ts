import { getDirs } from './utilities/helpers.task';

export const source = ['common', 'classes', 'core', 'decorators', 'packages', 'utilities'];
export const samplePath = 'sample';

export const packagePath = getDirs(source);
