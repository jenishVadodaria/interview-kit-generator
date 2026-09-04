import mongoose, { Document, Schema, Model } from 'mongoose';
import { Kit } from '@interview-prep-kit/shared';

export interface IKitDocument extends Document<string>, Omit<Kit, 'id'> {
  _id: string;
}

const kitSchema = new Schema<IKitDocument>({
  _id: { type: String, required: true },
  user_id: { type: String, required: true, index: true },
  job_title: { type: String, required: true },
  company_url: { type: String, required: true },
  days_available: { type: Number, required: true },
  created_at: { type: String, required: true },
  updated_at: { type: String, required: true },
  company_brief: { type: Schema.Types.Mixed, required: true },
  requirements: { type: Schema.Types.Mixed, required: true },
  questions: { type: Schema.Types.Mixed, required: true },
  flashcards: { type: Schema.Types.Mixed, required: true },
  schedule: { type: Schema.Types.Mixed, required: true },
  readiness_score: { type: Schema.Types.Mixed }
}, {
  _id: false, // We provide our own _id as string
});

export const KitModel = (mongoose.models.Kit as Model<IKitDocument>) || mongoose.model<IKitDocument>('Kit', kitSchema);

export class KitRepository {
  async getKitsByUserId(userId: string): Promise<Kit[]> {
    const docs = await KitModel.find({ user_id: userId }).lean().exec();
    return docs.map(this.mapToKit);
  }

  async getKitByIdAndUserId(id: string, userId: string): Promise<Kit | null> {
    const doc = await KitModel.findOne({ _id: id, user_id: userId }).lean().exec();
    return doc ? this.mapToKit(doc) : null;
  }

  async createKit(kit: Kit): Promise<Kit> {
    const doc = new KitModel({
      ...kit,
      _id: kit.id
    });
    await doc.save();
    return kit;
  }

  async updateKit(id: string, userId: string, updateData: Partial<Kit>): Promise<Kit | null> {
    const doc = await KitModel.findOneAndUpdate(
      { _id: id, user_id: userId },
      { $set: { ...updateData, updated_at: new Date().toISOString() } },
      { new: true }
    ).lean().exec();
    return doc ? this.mapToKit(doc) : null;
  }

  async deleteKit(id: string, userId: string): Promise<boolean> {
    const res = await KitModel.deleteOne({ _id: id, user_id: userId });
    return res.deletedCount === 1;
  }

  private mapToKit(doc: any): Kit {
    const { _id, __v, ...rest } = doc;
    return {
      id: _id,
      ...rest
    } as Kit;
  }
}
