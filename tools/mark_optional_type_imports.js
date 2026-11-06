const { readdirSync, readFileSync, statSync, writeFileSync } = require('fs');
const { join } = require('path');

// Database drivers are optional peers, but the published types import them. Without
// this, apps get TS2307 from inside DolphJS for every driver they didn't install.
// `// @ts-ignore` can't go in the source because tsc drops it from .d.ts output.
const OPTIONAL_DRIVERS = ['mongoose', 'sequelize', 'typeorm'];
const MARKER = '// @ts-ignore optional peer dependency, resolves to any when not installed';
const DRIVER_IMPORT = new RegExp(`^import .* from ['"](${OPTIONAL_DRIVERS.join('|')})['"];?\\r?$`, 'gm');

const declarationFiles = (directory) =>
    readdirSync(directory).flatMap((entry) => {
        const path = join(directory, entry);

        if (entry === 'node_modules') return [];
        if (statSync(path).isDirectory()) return declarationFiles(path);
        return path.endsWith('.d.ts') ? [path] : [];
    });

const markOptionalTypeImports = (directory) => {
    const marked = [];

    declarationFiles(directory).forEach((file) => {
        const source = readFileSync(file, 'utf8');
        const lines = source.replaceAll(`${MARKER}\n`, '');
        const updated = lines.replace(DRIVER_IMPORT, (line) => `${MARKER}\n${line}`);

        if (updated !== source) {
            writeFileSync(file, updated);
            marked.push(file);
        }
    });

    return marked;
};

if (require.main === module) {
    const directory = process.argv[2] ?? 'dist';
    console.log(`Marked optional driver imports in ${markOptionalTypeImports(directory).length} files`);
}

module.exports = { markOptionalTypeImports };
