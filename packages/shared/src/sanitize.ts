import type { Kit } from './schema.js';

// Internal fields stored in MongoDB but never exposed in API output.
const INTERNAL_FIELDS = ['_source', '_pinned', '_id', '__v'] as const;

// Strips internal fields from a kit before sending to the client or writing to batch output.
export function sanitizeKitForOutput(kit: Kit & Record<string, unknown>): Kit {
  const sanitized = { ...kit };
  for (const field of INTERNAL_FIELDS) {
    delete sanitized[field];
  }
  // Also strip from nested question/flashcard arrays
  sanitized.questions = kit.questions.map((q) => {
    const { ...clean } = q as typeof q & Record<string, unknown>;
    for (const field of INTERNAL_FIELDS) delete (clean as Record<string, unknown>)[field];
    return clean;
  });
  sanitized.flashcards = kit.flashcards.map((f) => {
    const { ...clean } = f as typeof f & Record<string, unknown>;
    for (const field of INTERNAL_FIELDS) delete (clean as Record<string, unknown>)[field];
    return clean;
  });
  return sanitized as Kit;
}
