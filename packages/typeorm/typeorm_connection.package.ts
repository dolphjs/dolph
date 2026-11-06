import { loadOptionalDriver } from '../../utilities/load_optional_driver.utilities';
import type { DataSource } from 'typeorm';
import { TypeOrmConfig } from '../../common';

// Apps install this themselves, and only load it if they use it.
const loadTypeOrm = () => loadOptionalDriver<typeof import('typeorm')>('typeorm', () => require('typeorm'));

let DolphDataSource: DataSource | null = null;

/**
 * Used to Initialise TypeORM
 * @returns the DataSource instance
 *
 * @version 2.0.0
 */
const initTypeOrm = (config: TypeOrmConfig): DataSource => {
    const { DataSource: TypeOrmDataSource } = loadTypeOrm();
    DolphDataSource = new TypeOrmDataSource(config.options);
    return DolphDataSource;
};

/**
 * Retrieve the global TypeORM DataSource instance
 * @returns {DataSource}
 */
const getDataSource = (): DataSource => {
    if (!DolphDataSource) {
        throw new Error('TypeORM DataSource is not ready. Add `database.typeorm` to dolph_config.yaml, and only call getDataSource() after `await dolph.ready()` or inside a request.');
    }
    return DolphDataSource;
};

export { initTypeOrm, getDataSource, DolphDataSource };
