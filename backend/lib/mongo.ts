import mongoose from 'mongoose';

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://127.0.0.1:27017/zemen_express';

let connected = false;

export const connectMongo = async () => {
  if (connected) return;
  mongoose.set('strictQuery', false);
  await mongoose.connect(MONGODB_URI);
  connected = true;
};

export default mongoose;
