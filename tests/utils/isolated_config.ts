import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { dump } from 'js-yaml';

/**
 * DolphFactory reads dolph_config.yaml from the working directory, so a test with its
 * own config runs from a private folder. Writing to the repo's file instead would change
 * it for every other test file running at the same time.
 *
 * Call the returned function once the app is wired to go back.
 */
export const useConfig = (config: object | null) => {
    const directory = mkdtempSync(join(tmpdir(), 'dolph-config-'));
    const previous = process.cwd();

    process.chdir(directory);

    if (config) {
        writeFileSync('dolph_config.yaml', dump({ routing: { base: '/v1' }, jsonLimit: '5mb', ...config }));
    }

    return () => {
        process.chdir(previous);
        rmSync(directory, { recursive: true, force: true });
    };
};
