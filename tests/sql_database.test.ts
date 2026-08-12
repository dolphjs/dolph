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

describe('SQL Database Auto Initialization', () => {
    describe('TypeORM', () => {
        let server: any;
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

            const factory = new DolphFactory([]);
            server = factory.start();
            dataSource = getDataSource();
        });

        afterAll((done) => {
            if (originalConfig) {
                fs.writeFileSync('dolph_config.yaml', originalConfig);
            } else {
                fs.unlinkSync('dolph_config.yaml');
            }

            if (server) {
                try { server.close(done); } catch (e) { done(); }
            }
            else done();
        });

        it('should have initialized the TypeORM DataSource', () => {
            expect(dataSource).toBeDefined();
            expect(dataSource.isInitialized).toBe(true);
        });
    });

    describe('Sequelize', () => {
        let server: any;
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

            const factory = new DolphFactory([]);
            server = factory.start();
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

        afterAll((done) => {
            if (originalConfig) {
                fs.writeFileSync('dolph_config.yaml', originalConfig);
            } else {
                fs.unlinkSync('dolph_config.yaml');
            }

            if (server) {
                try { server.close(done); } catch (e) { done(); }
            }
            else done();
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
