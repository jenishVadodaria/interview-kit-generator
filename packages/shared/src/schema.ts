import { z } from 'zod';

// --- Enums ---

export const CategoryEnum = z.enum(['technical', 'behavioural', 'system_design', 'company_fit']);
export type Category = z.infer<typeof CategoryEnum>;

export const DifficultyEnum = z.enum(['1', '2', '3']).transform(Number).or(z.number().int().min(1).max(3));

export const PriorityEnum = z.enum(['must_know', 'good_to_know', 'nice_to_have']);
export type Priority = z.infer<typeof PriorityEnum>;

export const KindEnum = z.enum(['skill', 'experience', 'trait', 'knowledge']);
export type Kind = z.infer<typeof KindEnum>;

export const BatchStatusEnum = z.enum(['ok', 'partial', 'error']);
export type BatchStatus = z.infer<typeof BatchStatusEnum>;

// --- Requirement ---

export const RequirementSchema = z.object({
  id: z.string().regex(/^r\d+$/),
  text: z.string().min(1),
  kind: KindEnum,
  priority: PriorityEnum,
});
export type Requirement = z.infer<typeof RequirementSchema>;

// --- Source reference (internal, stripped on output) ---

export const SourceMetaSchema = z.object({
  _source: z.enum(['generated', 'edited']).default('generated'),
  _pinned: z.boolean().default(false),
});
export type SourceMeta = z.infer<typeof SourceMetaSchema>;

// --- Question ---

export const QuestionSchema = z.object({
  id: z.string().regex(/^q\d+$/),
  requirement_ids: z.array(z.string().regex(/^r\d+$/)).min(1),
  category: CategoryEnum,
  text: z.string().min(1),
  difficulty: z.number().int().min(1).max(3),
  answer_hint: z.string().min(1),
});
export type Question = z.infer<typeof QuestionSchema>;

// --- Flashcard ---

export const FlashcardSchema = z.object({
  id: z.string().regex(/^f\d+$/),
  front: z.string().min(1),
  back: z.string().min(1),
  requirement_ids: z.array(z.string().regex(/^r\d+$/)).min(1),
});
export type Flashcard = z.infer<typeof FlashcardSchema>;

// --- Schedule Day ---

export const ScheduleDaySchema = z.object({
  day: z.number().int().min(1),
  focus: z.string().min(1),
  question_ids: z.array(z.string().regex(/^q\d+$/)),
  flashcard_ids: z.array(z.string().regex(/^f\d+$/)),
  estimated_minutes: z.number().int().positive(),
});
export type ScheduleDay = z.infer<typeof ScheduleDaySchema>;

// --- Company Brief ---

export const CompanyBriefSchema = z.object({
  company_name: z.string().min(1),
  summary: z.string().min(1),
  culture_notes: z.string(),
  recent_news: z.array(z.string()),
  sources: z.array(z.string().url()),
});
export type CompanyBrief = z.infer<typeof CompanyBriefSchema>;

// --- Interview Readiness Score (creative feature) ---

export const WeakSpotSchema = z.object({
  requirement_id: z.string().regex(/^r\d+$/),
  reason: z.string(),
});
export type WeakSpot = z.infer<typeof WeakSpotSchema>;

export const ReadinessScoreSchema = z.object({
  overall: z.number().min(0).max(100),
  coverage_pct: z.number().min(0).max(100),
  schedule_pct: z.number().min(0).max(100),
  practice_pct: z.number().min(0).max(100),
  confidence_avg: z.number().min(0).max(100),
  by_category: z.record(z.string(), z.number().min(0).max(100)),
  weak_spots: z.array(WeakSpotSchema),
  gap_count: z.number().int().min(0),
  rationale: z.string(),
});
export type ReadinessScore = z.infer<typeof ReadinessScoreSchema>;

// --- Practice Session ---

export const FlashcardRatingSchema = z.object({
  flashcard_id: z.string().regex(/^f\d+$/),
  confidence: z.number().int().min(1).max(5),
});
export type FlashcardRating = z.infer<typeof FlashcardRatingSchema>;

export const PracticeSessionSchema = z.object({
  id: z.string().min(1),
  kit_id: z.string().min(1),
  user_id: z.string().min(1),
  created_at: z.string(),
  flashcard_ratings: z.array(FlashcardRatingSchema).min(1),
});
export type PracticeSession = z.infer<typeof PracticeSessionSchema>;

// --- Kit (Appendix A) ---

export const KitSchema = z.object({
  id: z.string().min(1),
  user_id: z.string().min(1),
  job_title: z.string().min(1),
  company_url: z.string().url(),
  days_available: z.number().int().min(1).max(60),
  created_at: z.string().datetime(),
  updated_at: z.string().datetime(),
  company_brief: CompanyBriefSchema,
  requirements: z.array(RequirementSchema).min(1),
  questions: z.array(QuestionSchema).min(1),
  flashcards: z.array(FlashcardSchema),
  schedule: z.array(ScheduleDaySchema).min(1),
  readiness_score: ReadinessScoreSchema.optional(),
});
export type Kit = z.infer<typeof KitSchema>;

// --- Batch Input (Appendix B) ---

export const BatchInputItemSchema = z.object({
  id: z.string().min(1),
  jd: z.string().min(1),
  company_url: z.string().url(),
  days: z.number().int().min(1).max(60),
});
export type BatchInputItem = z.infer<typeof BatchInputItemSchema>;

export const BatchInputSchema = z.array(BatchInputItemSchema).min(1);
export type BatchInput = z.infer<typeof BatchInputSchema>;

// --- Batch Output (Appendix B) ---

export const BatchOutputItemSchema = z.object({
  id: z.string().min(1),
  status: BatchStatusEnum,
  kit: KitSchema.optional(),
  error: z.string().optional(),
}).refine(
  (item) => item.status !== 'ok' || item.kit !== undefined,
  { message: 'kit is required when status is ok' }
).refine(
  (item) => item.status !== 'error' || item.error !== undefined,
  { message: 'error is required when status is error' }
);
export type BatchOutputItem = z.infer<typeof BatchOutputItemSchema>;

export const BatchOutputSchema = z.object({
  version: z.literal('1.0'),
  generated_at: z.string().datetime(),
  kits: z.array(BatchOutputItemSchema),
});
export type BatchOutput = z.infer<typeof BatchOutputSchema>;

