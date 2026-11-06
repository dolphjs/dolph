import { DolphFactory } from '../core';
import { getDataSource } from '../packages/typeorm';
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from 'typeorm';

@Entity()
class UserTypeOrm {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';

// readConfigFile() always reads `dolph_config.yaml` relative to process.cwd()
// — there's no way to point a DolphFactory at a different path. Writing a
// mock config to the repo-root file (as this test used to) mutates state
// every other concurrently-running test file's DolphFactory constructor
// also reads, since Jest workers are separate processes but all share the
// same filesystem and the same starting CWD. Whichever test happened to
// construct a factory while this one had the file swapped out would read a
// config with no `routing.base` and register its routes at the wrong path
// — a real, timing-dependent cross-file failure, not mere flakiness.
// chdir() into a private temp directory instead: it only affects this
// process, so no other concurrently-running worker ever sees it.
function withIsolatedCwd(): { originalCwd: string; restore: () => void } {
    const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'dolph-sql-test-'));
    const originalCwd = process.cwd();
    process.chdir(tmpDir);
    return {
        originalCwd,
        restore: () => {
            process.chdir(originalCwd);
            fs.rmSync(tmpDir, { recursive: true, force: true });
        },
    };
}

describe('SQL Database Auto Initialization', () => {
    describe('TypeORM', () => {
        let dolph: DolphFactory;
        let dataSource: DataSource;
        let cwd: { originalCwd: string; restore: () => void };

        beforeAll(async () => {
            cwd = withIsolatedCwd();

            const mockConfig = {
                port: 3333,
                database: {
                    typeorm: {
                        options: {
                            type: 'better-sqlite3',
                            database: ':memory:',
                            dropSchema: true,
                            // Entities is a glob string that gets written to
                            // (and read back from) an actual YAML file, so it
                            // has to stay a string, not a class reference —
                            // absolute, since CWD is now the isolated temp
                            // dir above rather than the repo root the
                            // original relative path assumed.
                            entities: [path.join(cwd.originalCwd, 'tests/sql_database.test.ts')],
                            synchronize: true,
                            logging: false,
                        },
                    },
                },
            };

            fs.writeFileSync('dolph_config.yaml', yaml.dump(mockConfig));

            dolph = new DolphFactory([]);
            await dolph.ready();
            dataSource = getDataSource();
        });

        afterAll(async () => {
            await dolph.stop();
            cwd.restore();
        });

        it('should have initialized the TypeORM DataSource', () => {
            expect(dataSource).toBeDefined();
            expect(dataSource.isInitialized).toBe(true);
        });
    });
});
