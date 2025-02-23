import { INTEGER, STRING } from 'sequelize';
import { mysql } from './sqlDb';

const User = mysql.define('user', {
    id: {
        type: INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
    },
    username: {
        type: STRING,
        allowNull: false,
    },
    age: INTEGER,
});

export { User };
