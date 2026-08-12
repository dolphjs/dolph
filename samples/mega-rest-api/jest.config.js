// Standalone jest config for this sample. The root dolph jest.config.js
// deliberately ignores `/samples/` (its own suite tests the framework, not
// the samples) — so this sample carries its own config, exactly like a real
// scaffolded app would.
//
// `@dolphjs/testing` isn't published yet, so `@dolphjs/testing` is mapped to
// its source in the sibling `../../../testing` repo, and `@dolphjs/dolph` is
// mapped to *this repo's own source* rather than downloading either from npm.
//
// Mapping `@dolphjs/dolph` to source (not `dist/`) matters, not just style:
// every file in this sample reaches the framework via deep relative imports
// into that same source tree (e.g. `../../../../../classes`). If
// `@dolphjs/testing`'s `@dolphjs/dolph` import resolved to `dist/` instead,
// Jest would load two separate compiled copies of the framework — including
// two separate `GlobalServiceRegistry` singletons — and a mock registered
// through one would be invisible to `@Component` resolving through the
// other. Pointing both at the same source tree keeps everything on one
// module graph, one registry, one singleton.
module.exports = {
    preset: 'ts-jest',
    testEnvironment: 'node',
    testMatch: ['**/*.spec.ts', '**/*.e2e-spec.ts'],
    transform: {
        '^.+\\.ts?$': ['ts-jest', { isolatedModules: true }],
    },
    moduleNameMapper: {
        '^@dolphjs/testing$': '<rootDir>/../../../testing/src/index.ts',
        '^@dolphjs/dolph/(.*)$': '<rootDir>/../../$1',
        '^@dolphjs/dolph$': '<rootDir>/../../index.ts',
    },
};
