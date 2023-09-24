import mongoose, { Schema, Document } from 'mongoose';

export interface IUser extends Document {
  name: string;
  email: string;
  age: string;
  work: string;
  height: string;
}

const userSchema = new Schema({
  name: String,
  email: String,
  age: Number,
  work: String,
  height: String,
});

const userModel = mongoose.model<IUser>('User', userSchema);
export { userModel };
