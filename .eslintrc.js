module.exports = {
    root: true,
    env: {
        node: true,
    },
    plugins: ['@typescript-eslint/eslint-plugin'],
    extends: ['plugin:@typescript-eslint/recommended', 'prettier'],
    overrides: [
        {
            files: ['**/*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: 'tsconfig.json',
                sourceType: 'module',
            },
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    {
                        argsIgnorePattern: '^_',
                        varsIgnorePattern: '^_',
                        caughtErrorsIgnorePattern: '^_',
                    },
                ],
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/no-require-imports': 'off',
                '@typescript-eslint/no-wrapper-object-types': 'off',
                '@typescript-eslint/no-unsafe-function-type': 'off',
            },
        },
        {
            files: ['**/*.spec.ts', '**/*.test.ts', 'integration/**/*.ts', 'tests/**/*.ts'],
            parser: '@typescript-eslint/parser',
            parserOptions: {
                project: 'tsconfig.spec.json',
                sourceType: 'module',
            },
            rules: {
                '@typescript-eslint/explicit-function-return-type': 'off',
                '@typescript-eslint/no-explicit-any': 'off',
                '@typescript-eslint/explicit-module-boundary-types': 'off',
                '@typescript-eslint/no-unused-vars': [
                    'warn',
                    {
                        argsIgnorePattern: '^_',
                        varsIgnorePattern: '^_',
                        caughtErrorsIgnorePattern: '^_',
                    },
                ],
                '@typescript-eslint/ban-types': 'off',
                '@typescript-eslint/no-empty-function': 'off',
                '@typescript-eslint/no-require-imports': 'off',
                '@typescript-eslint/no-wrapper-object-types': 'off',
                '@typescript-eslint/no-unsafe-function-type': 'off',
            },
        },
    ],
};
