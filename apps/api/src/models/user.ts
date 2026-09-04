import mongoose, { type Document, type Model, Schema } from 'mongoose';
import * as bcrypt from 'bcrypt';

export interface IUser {
  email: string;
  password: string;
  comparePassword(candidate: string): Promise<boolean>;
}

export interface IUserDocument extends IUser, Document {}

const userSchema = new Schema<IUserDocument>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
  },
  { timestamps: true }
);

userSchema.pre('save', async function (this: IUserDocument, next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.method('comparePassword', async function (this: IUserDocument, candidate: string): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
});

export const User: Model<IUserDocument> = mongoose.model<IUserDocument>('User', userSchema);
