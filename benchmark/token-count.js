'use strict';

/**
 * Counts the tokens in each version of the orders feature in benchmark/tokens. Uses
 * cl100k, a widely used tokenizer. Other models split text a little differently, so
 * compare the versions rather than reading these as an exact bill.
 *
 *   node benchmark/token-count.js
 */

const { readdirSync, readFileSync } = require('fs');
const { join } = require('path');
const { getEncoding } = require('js-tiktoken');

const ROOT = join(__dirname, 'tokens');
const encoding = getEncoding('cl100k_base');

const results = Object.fromEntries(
    ['express', 'nest', 'dolph'].map((name) => {
        const directory = join(ROOT, name);
        const files = readdirSync(directory);
        const source = files.map((file) => readFileSync(join(directory, file), 'utf8'));
        const tokens = source.reduce((total, text) => total + encoding.encode(text).length, 0);

        return [name, { files: files.length, tokens }];
    }),
);

console.log(JSON.stringify(results, null, 2));
