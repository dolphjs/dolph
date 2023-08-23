import mongoose, { Schema } from 'mongoose';

const userSchema = new Schema({
  name: String,
  email: String,
  age: Number,
  work: String,
  height: String,
});

const userModel = mongoose.model('User', userSchema);
export { userModel };
