import { describe, it, expect } from 'vitest';
import {
  KitSchema,
  BatchOutputItemSchema,
  BatchOutputSchema,
  RequirementSchema,
  QuestionSchema,
  FlashcardSchema,
} from '../schema.js';
import { validateKit, isKitValid } from '../validators.js';
import { generateIds, nextId } from '../id-generator.js';
import { sanitizeKitForOutput } from '../sanitize.js';
import { markAsEdited, mergeWithPinned } from '../state-model.js';
import type { Kit } from '../schema.js';
import type { EditableItemMeta } from '../state-model.js';

// --- Fixtures ---

const VALID_KIT: Kit = {
  id: 'kit-1',
  user_id: 'user-1',
  job_title: 'Backend Engineer',
  company_url: 'https://stripe.com',
  days_available: 2,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  company_brief: {
    company_name: 'Stripe',
    summary: 'Global payments platform.',
    culture_notes: 'Data-driven, high ownership.',
    recent_news: ['Stripe raised Series I'],
    sources: ['https://stripe.com/about'],
  },
  requirements: [
    { id: 'r1', text: 'Node.js proficiency', kind: 'skill', priority: 'must_know' },
    { id: 'r2', text: '3+ years experience', kind: 'experience', priority: 'good_to_know' },
  ],
  questions: [
    { id: 'q1', requirement_ids: ['r1'], category: 'technical', text: 'Explain the Node.js event loop.', difficulty: 2, answer_hint: 'Focus on single-threaded non-blocking I/O.' },
    { id: 'q2', requirement_ids: ['r2'], category: 'behavioural', text: 'Describe a complex project.', difficulty: 1, answer_hint: 'Use STAR format.' },
  ],
  flashcards: [
    { id: 'f1', front: 'What is the event loop?', back: 'Single-threaded loop handling async callbacks.', requirement_ids: ['r1'] },
  ],
  schedule: [
    { day: 1, focus: 'Technical', question_ids: ['q1'], flashcard_ids: ['f1'], estimated_minutes: 40 },
    { day: 2, focus: 'Behavioural', question_ids: ['q2'], flashcard_ids: [], estimated_minutes: 25 },
  ],
};

// --- Schema tests ---

describe('KitSchema', () => {
  it('parses a valid kit', () => {
    const result = KitSchema.safeParse(VALID_KIT);
    expect(result.success).toBe(true);
  });

  it('rejects a kit with no requirements', () => {
    const kit = { ...VALID_KIT, requirements: [] };
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it('rejects a kit with no questions', () => {
    const kit = { ...VALID_KIT, questions: [] };
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it('rejects an invalid company_url', () => {
    const kit = { ...VALID_KIT, company_url: 'not-a-url' };
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });

  it('rejects days_available > 60', () => {
    const kit = { ...VALID_KIT, days_available: 61 };
    expect(KitSchema.safeParse(kit).success).toBe(false);
  });
});

describe('Enum spelling', () => {
  it('rejects "behavioral" (American spelling) — must be "behavioural"', () => {
    const q = { id: 'q1', requirement_ids: ['r1'], category: 'behavioral', text: 'Q', difficulty: 1, answer_hint: 'A' };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });

  it('accepts "behavioural" (correct British spelling per spec)', () => {
    const q = { id: 'q1', requirement_ids: ['r1'], category: 'behavioural', text: 'Q', difficulty: 1, answer_hint: 'A' };
    expect(QuestionSchema.safeParse(q).success).toBe(true);
  });
});

describe('Difficulty validation', () => {
  it('rejects a float difficulty like 2.5', () => {
    const q = { id: 'q1', requirement_ids: ['r1'], category: 'technical', text: 'Q', difficulty: 2.5, answer_hint: 'A' };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });

  it('rejects difficulty 0', () => {
    const q = { id: 'q1', requirement_ids: ['r1'], category: 'technical', text: 'Q', difficulty: 0, answer_hint: 'A' };
    expect(QuestionSchema.safeParse(q).success).toBe(false);
  });
});

// --- Validator tests ---

describe('validateKit', () => {
  it('returns no errors for a valid kit', () => {
    expect(validateKit(VALID_KIT)).toHaveLength(0);
    expect(isKitValid(VALID_KIT)).toBe(true);
  });

  it('catches a dangling question requirement_id', () => {
    const kit: Kit = {
      ...VALID_KIT,
      questions: [{ ...VALID_KIT.questions[0]!, requirement_ids: ['r99'] }],
    };
    const errors = validateKit(kit);
    expect(errors.some((e) => e.message.includes('r99'))).toBe(true);
  });

  it('catches schedule.length !== days_available', () => {
    const kit: Kit = { ...VALID_KIT, days_available: 5 };
    const errors = validateKit(kit);
    expect(errors.some((e) => e.field === 'schedule')).toBe(true);
  });

  it('catches a dangling schedule question_id', () => {
    const kit: Kit = {
      ...VALID_KIT,
      schedule: [
        { day: 1, focus: 'Technical', question_ids: ['q99'], flashcard_ids: [], estimated_minutes: 30 },
        { day: 2, focus: 'Behavioural', question_ids: ['q2'], flashcard_ids: [], estimated_minutes: 25 },
      ],
    };
    const errors = validateKit(kit);
    expect(errors.some((e) => e.message.includes('q99'))).toBe(true);
  });
});

// --- ID generator tests ---

describe('generateIds', () => {
  it('generates correct IDs from 1', () => {
    expect(generateIds('q', 3)).toEqual(['q1', 'q2', 'q3']);
  });

  it('generates IDs from a custom start', () => {
    expect(generateIds('r', 2, 5)).toEqual(['r5', 'r6']);
  });

  it('generates a single ID with nextId', () => {
    expect(nextId('f', 7)).toBe('f7');
  });
});

// --- Batch schema tests ---

describe('BatchOutputItemSchema', () => {
  it('requires kit when status is ok', () => {
    const item = { id: 'case-1', status: 'ok' };
    expect(BatchOutputItemSchema.safeParse(item).success).toBe(false);
  });

  it('requires error when status is error', () => {
    const item = { id: 'case-1', status: 'error' };
    expect(BatchOutputItemSchema.safeParse(item).success).toBe(false);
  });

  it('accepts a valid error item', () => {
    const item = { id: 'case-1', status: 'error', error: 'LLM timeout' };
    expect(BatchOutputItemSchema.safeParse(item).success).toBe(true);
  });
});

// --- Sanitize tests ---

describe('sanitizeKitForOutput', () => {
  it('strips _source and _pinned from the kit', () => {
    const dirtyKit = { ...VALID_KIT, _source: 'generated', _pinned: false } as Kit & Record<string, unknown>;
    const clean = sanitizeKitForOutput(dirtyKit);
    expect(Object.keys(clean)).not.toContain('_source');
    expect(Object.keys(clean)).not.toContain('_pinned');
  });
});

// --- State model tests ---

describe('markAsEdited', () => {
  it('sets _source=edited and _pinned=true', () => {
    const item: EditableItemMeta = { _source: 'generated', _pinned: false };
    const edited = markAsEdited(item);
    expect(edited._source).toBe('edited');
    expect(edited._pinned).toBe(true);
  });
});

describe('mergeWithPinned', () => {
  it('preserves pinned items and replaces unpinned', () => {
    type Item = EditableItemMeta & { value: string };
    const existing: Item[] = [
      { value: 'A', _source: 'edited', _pinned: true },
      { value: 'B', _source: 'generated', _pinned: false },
    ];
    const fresh: Item[] = [
      { value: 'C', _source: 'generated', _pinned: false },
    ];
    const merged = mergeWithPinned(existing, fresh);
    expect(merged[0]!.value).toBe('A'); // pinned — kept
    expect(merged[1]!.value).toBe('C'); // unpinned — replaced
  });
});
