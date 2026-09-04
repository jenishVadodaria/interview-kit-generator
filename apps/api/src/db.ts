import mongoose from 'mongoose';

let connected = false;

export async function connectDb(uri: string): Promise<void> {
  if (connected) return;
  await mongoose.connect(uri);
  connected = true;
  console.info('MongoDB connected');
}

export async function disconnectDb(): Promise<void> {
  await mongoose.disconnect();
  connected = false;
}
