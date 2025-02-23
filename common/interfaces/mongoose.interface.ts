import mongoose from 'mongoose';

interface MongooseConfig {
    url: string;
    options?: mongoose.ConnectOptions;
}

export { MongooseConfig };
