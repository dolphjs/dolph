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
import * as yaml from 'js-yaml';
import { configs } from '../core/config.core';

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

describe('SQL Database Auto Initialization', () => {
    describe('TypeORM', () => {
        let dataSource: DataSource;
        let originalConfig: string;

        beforeAll(async () => {
            // Backup the original dolph_config.yaml
            try {
                originalConfig = fs.readFileSync('dolph_config.yaml', 'utf8');
            } catch (e) {
                // Ignore if it doesn't exist
            }

            const mockConfig = {
                port: 3333,
                database: {
                    typeorm: {
                        options: {
                            type: 'better-sqlite3',
                            database: ':memory:',
                            dropSchema: true,
                            entities: ['tests/sql_database.test.ts'],
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
            if (originalConfig) {
                fs.writeFileSync('dolph_config.yaml', originalConfig);
            } else {
                fs.unlinkSync('dolph_config.yaml');
            }
        });

        it('should have initialized the TypeORM DataSource', () => {
            expect(dataSource).toBeDefined();
            expect(dataSource.isInitialized).toBe(true);
        });
    });

    describe('Sequelize', () => {
        let sequelize: Sequelize;
        let originalConfig: string;

        beforeAll(async () => {
            try {
                originalConfig = fs.readFileSync('dolph_config.yaml', 'utf8');
            } catch (e) {
                // Ignore if it doesn't exist
            }

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
            if (originalConfig) {
                fs.writeFileSync('dolph_config.yaml', originalConfig);
            } else {
                fs.unlinkSync('dolph_config.yaml');
            }
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
