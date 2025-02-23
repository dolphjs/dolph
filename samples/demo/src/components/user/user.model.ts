import { Schema, Document, model } from 'mongoose';

export interface IUser extends Document {}

const UserSchema = new Schema({});

export const UserModel = model<IUser>('users', UserSchema);
