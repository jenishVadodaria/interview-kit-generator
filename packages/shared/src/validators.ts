import type { Kit } from './schema.js';

export interface ValidationError {
  field: string;
  message: string;
}

// Validates cross-references and structural integrity of a kit.
export function validateKit(kit: Kit): ValidationError[] {
  const errors: ValidationError[] = [];

  const requirementIds = new Set(kit.requirements.map((r) => r.id));
  const questionIds = new Set(kit.questions.map((q) => q.id));
  const flashcardIds = new Set(kit.flashcards.map((f) => f.id));

  // 1. All question.requirement_ids must reference existing requirements
  for (const question of kit.questions) {
    for (const rid of question.requirement_ids) {
      if (!requirementIds.has(rid)) {
        errors.push({ field: `question.${question.id}`, message: `Dangling requirement_id: ${rid}` });
      }
    }
  }

  // 2. All flashcard.requirement_ids must reference existing requirements
  for (const flashcard of kit.flashcards) {
    for (const rid of flashcard.requirement_ids) {
      if (!requirementIds.has(rid)) {
        errors.push({ field: `flashcard.${flashcard.id}`, message: `Dangling requirement_id: ${rid}` });
      }
    }
  }

  // 3. Schedule question_ids must reference existing questions
  for (const day of kit.schedule) {
    for (const qid of day.question_ids) {
      if (!questionIds.has(qid)) {
        errors.push({ field: `schedule.day${day.day}`, message: `Dangling question_id: ${qid}` });
      }
    }
    for (const fid of day.flashcard_ids) {
      if (!flashcardIds.has(fid)) {
        errors.push({ field: `schedule.day${day.day}`, message: `Dangling flashcard_id: ${fid}` });
      }
    }
  }

  // 4. schedule.length must equal days_available
  if (kit.schedule.length !== kit.days_available) {
    errors.push({
      field: 'schedule',
      message: `schedule has ${kit.schedule.length} days but days_available is ${kit.days_available}`,
    });
  }

  // 5. difficulty must be integer 1-3 (guard against LLM returning 2.5 etc.)
  for (const question of kit.questions) {
    if (!Number.isInteger(question.difficulty) || question.difficulty < 1 || question.difficulty > 3) {
      errors.push({ field: `question.${question.id}`, message: `difficulty must be integer 1-3, got ${question.difficulty}` });
    }
  }

  // 6. estimated_minutes must be positive integer
  for (const day of kit.schedule) {
    if (!Number.isInteger(day.estimated_minutes) || day.estimated_minutes <= 0) {
      errors.push({ field: `schedule.day${day.day}`, message: `estimated_minutes must be positive integer, got ${day.estimated_minutes}` });
    }
  }

  return errors;
}

// Returns true only when the kit has zero cross-reference errors.
export function isKitValid(kit: Kit): boolean {
  return validateKit(kit).length === 0;
}
