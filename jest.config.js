// const { pathsToModuleNameMapper } = require('ts-jest/utils');
const { compilerOptions } = require('./tsconfig.json');

module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
   testPathIgnorePatterns: ['/node_modules/', '/dist/', '/samples/', '/tools/'],
  roots: ['<rootDir>'],
  transform: {
    '^.+\\.ts?$': 'ts-jest',
  },
  transformIgnorePatterns: [
    'node_modules/(?!(fs-temp|random-path)/)'
  ],
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js']
  //   moduleNameMapper: pathsToModuleNameMapper(compilerOptions.paths, { prefix: '<rootDir>' }),
};
