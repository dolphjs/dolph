import { DolphFactory } from '../core';
import { getDataSource } from '../packages/typeorm';
import { getSequelize } from '../packages/sequelize';
import { Entity, PrimaryGeneratedColumn, Column, DataSource } from 'typeorm';
import { DataTypes, Model, Sequelize } from 'sequelize';

@Entity()
class UserTypeOrm {
    @PrimaryGeneratedColumn()
    id: number;

    @Column()
    name: string;
}

class UserSequelize extends Model {
    declare id: number;
    declare name: string;
}

import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import * as yaml from 'js-yaml';

// autoInitTypeOrm/autoInitSql (triggered from the DolphFactory constructor,
// via readConfigFile) kick off DataSource#initialize()/Sequelize#sync()
// fire-and-forget — the constructor returns before either promise settles.
// Poll instead of assuming it's done by the time the assertions run.
async function waitUntil(predicate: () => boolean, timeoutMs = 5000): Promise<void> {
    const start = Date.now();
    while (!predicate()) {
        if (Date.now() - start > timeoutMs) {
            throw new Error('timed out waiting for condition');
        }
        await new Promise((resolve) => setTimeout(resolve, 10));
    }
}

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

            // Constructing the factory is enough to trigger auto-init — no
            // server needs to be started to observe or use the DataSource.
            new DolphFactory([]);
            dataSource = getDataSource();
            await waitUntil(() => dataSource.isInitialized);
        });

        afterAll(() => {
            cwd.restore();
        });

        it('should have initialized the TypeORM DataSource', () => {
            expect(dataSource).toBeDefined();
            expect(dataSource.isInitialized).toBe(true);
        });
    });

    describe('Sequelize', () => {
        let sequelize: Sequelize;
        let cwd: { originalCwd: string; restore: () => void };

        beforeAll(async () => {
            cwd = withIsolatedCwd();

            const mockConfig = {
                port: 3334,
                database: {
                    sequelize: {
                        dialect: 'sqlite',
                        database: ':memory:',
                        options: {
                            logging: false,
                        },
                    },
                },
            };

            fs.writeFileSync('dolph_config.yaml', yaml.dump(mockConfig));

            new DolphFactory([]);
            sequelize = getSequelize();

            UserSequelize.init(
                {
                    id: {
                        type: DataTypes.INTEGER,
                        autoIncrement: true,
                        primaryKey: true,
                    },
                    name: {
                        type: new DataTypes.STRING(128),
                        allowNull: false,
                    },
                },
                {
                    tableName: 'users',
                    sequelize,
                }
            );
            await sequelize.sync({ force: true });
        });

        afterAll(() => {
            cwd.restore();
        });

        it('should have initialized the Sequelize instance', () => {
            expect(sequelize).toBeDefined();
        });

        it('should be able to perform operations', async () => {
            const user = await UserSequelize.create({ name: 'Test Sequelize' });
            expect(user.id).toBeDefined();
            expect(user.name).toBe('Test Sequelize');

            const fetchedUser = await UserSequelize.findOne({ where: { name: 'Test Sequelize' } });
            expect(fetchedUser).toBeDefined();
            expect(fetchedUser?.name).toBe('Test Sequelize');
        });
    });
});
