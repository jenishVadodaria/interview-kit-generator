import { z } from 'zod';
import { callLLM } from '@interview-prep-kit/llm';
import { Flashcard, Requirement, Question } from '@interview-prep-kit/shared';

const LLMFlashcardSchema = z.object({
  front: z.string(),
  back: z.string(),
  requirement_ids: z.array(z.string().regex(/^r\d+$/)).min(1)
});

const FlashcardsExtractionSchema = z.object({
  flashcards: z.array(LLMFlashcardSchema)
});

export async function generateFlashcards(
  requirements: Requirement[],
  questions: Question[]
): Promise<Flashcard[]> {
  if (requirements.length === 0) return [];

  const systemPrompt = `You are an expert technical educator. Create study flashcards for a candidate preparing for an interview based on the given requirements and existing questions.
Each flashcard must reference the requirement IDs it helps teach.
Return a JSON object with a "flashcards" array. Each flashcard should have:
- front: the prompt/concept (brief)
- back: the explanation/answer (concise but informative)
- requirement_ids: array of requirement IDs this flashcard relates to

Respond with JSON only.`;

  const reqsText = requirements.map(r => `[ID: ${r.id}] ${r.kind} - ${r.priority} - ${r.text}`).join('\n');
  const qsText = questions.map(q => `[ID: ${q.id} tied to ${q.requirement_ids.join(',')}] ${q.text}`).join('\n');
  
  const userPrompt = `Requirements:\n${reqsText}\n\nExisting Questions:\n${qsText}\n\nGenerate flashcards to cover key concepts from the requirements, avoiding exactly duplicating the questions.`;

  const result = await callLLM(systemPrompt, userPrompt, FlashcardsExtractionSchema);
  
  // Assign IDs in code
  return result.flashcards.map((f: any, i: number) => ({
    id: `f${i + 1}`,
    ...f
  }));
}
