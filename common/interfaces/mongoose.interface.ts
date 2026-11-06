import mongoose from 'mongoose';

interface MongooseConfig {
    url: string;
    options?: mongoose.ConnectOptions;
    /** Set to `false` to start without this database when it can't connect. */
    required?: boolean;
}

export { MongooseConfig };
