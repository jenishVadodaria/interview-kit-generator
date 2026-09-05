import mongoose, { Document, Schema, Model } from 'mongoose';
import { Kit, PracticeSession } from '@interview-prep-kit/shared';

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

// --- Practice Session ---

export interface IPracticeSessionDocument extends Document<string>, Omit<PracticeSession, 'id'> {
  _id: string;
}

const practiceSessionSchema = new Schema<IPracticeSessionDocument>({
  _id: { type: String, required: true },
  kit_id: { type: String, required: true, index: true },
  user_id: { type: String, required: true, index: true },
  created_at: { type: String, required: true },
  flashcard_ratings: { type: Schema.Types.Mixed, required: true },
}, {
  _id: false,
});

// Compound index: efficiently query all sessions for a specific user's kit
practiceSessionSchema.index({ kit_id: 1, user_id: 1 });

export const PracticeSessionModel =
  (mongoose.models.PracticeSession as Model<IPracticeSessionDocument>) ||
  mongoose.model<IPracticeSessionDocument>('PracticeSession', practiceSessionSchema);

export class PracticeSessionRepository {
  async createSession(session: PracticeSession): Promise<PracticeSession> {
    const doc = new PracticeSessionModel({
      ...session,
      _id: session.id,
    });
    await doc.save();
    return session;
  }

  async getSessionsByKitId(kitId: string, userId: string): Promise<PracticeSession[]> {
    const docs = await PracticeSessionModel
      .find({ kit_id: kitId, user_id: userId })
      .sort({ created_at: -1 })
      .lean()
      .exec();
    return docs.map(this.mapToSession);
  }

  async getSessionById(id: string, userId: string): Promise<PracticeSession | null> {
    const doc = await PracticeSessionModel
      .findOne({ _id: id, user_id: userId })
      .lean()
      .exec();
    return doc ? this.mapToSession(doc) : null;
  }

  private mapToSession(doc: any): PracticeSession {
    const { _id, __v, ...rest } = doc;
    return {
      id: _id,
      ...rest
    } as PracticeSession;
  }
}
