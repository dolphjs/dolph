import { mongoose } from '@dolphjs/core';

interface MongooseConfig {
  url: string;
  options?: mongoose.ConnectOptions;
}

export { MongooseConfig };
