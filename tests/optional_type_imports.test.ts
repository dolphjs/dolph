import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { markOptionalTypeImports } = require('../tools/mark_optional_type_imports');

describe('markOptionalTypeImports', () => {
    let directory: string;

    beforeEach(() => {
        directory = mkdtempSync(join(tmpdir(), 'dolph-types-'));
    });

    afterEach(() => {
        rmSync(directory, { recursive: true, force: true });
    });

    const write = (name: string, content: string) => {
        const path = join(directory, name);
        writeFileSync(path, content);
        return path;
    };

    it.each([
        ["import { Model } from 'mongoose';"],
        ['import { Options as SequelizeOptions } from "sequelize";'],
        ["import type { DataSource } from 'typeorm';"],
        ["import mongoose from 'mongoose';"],
    ])('should mark %s', (line) => {
        const file = write('a.d.ts', `${line}\nexport {};\n`);

        markOptionalTypeImports(directory);

        const lines = readFileSync(file, 'utf8').split('\n');
        expect(lines[0]).toContain('@ts-ignore');
        expect(lines[1]).toBe(line);
    });

    it('should leave other imports alone', () => {
        const source = "import { Router } from 'express';\nimport x from './typeorm';\n";
        const file = write('a.d.ts', source);

        expect(markOptionalTypeImports(directory)).toEqual([]);
        expect(readFileSync(file, 'utf8')).toBe(source);
    });

    it('should not change the output when run twice', () => {
        const file = write('a.d.ts', "import { Model } from 'mongoose';\n");

        markOptionalTypeImports(directory);
        const once = readFileSync(file, 'utf8');
        markOptionalTypeImports(directory);

        expect(readFileSync(file, 'utf8')).toBe(once);
    });

    it('should reach nested folders and skip anything that is not a declaration file', () => {
        mkdirSync(join(directory, 'nested'));
        const nested = write('nested/b.d.ts', "import { Model } from 'mongoose';\n");
        const script = write('nested/c.js', "import { Model } from 'mongoose';\n");

        expect(markOptionalTypeImports(directory)).toEqual([nested]);
        expect(readFileSync(script, 'utf8')).not.toContain('@ts-ignore');
    });
});
