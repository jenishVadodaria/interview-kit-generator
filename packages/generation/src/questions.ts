import { z } from 'zod';
import { callLLM } from '@interview-prep-kit/llm';
import { Question, Requirement, Category, CategoryEnum } from '@interview-prep-kit/shared';

const LLMQuestionSchema = z.object({
  requirement_ids: z.array(z.string().regex(/^r\d+$/)).min(1),
  category: CategoryEnum,
  text: z.string(),
  difficulty: z.number().int().min(1).max(3),
  answer_hint: z.string()
});

const QuestionsExtractionSchema = z.object({
  questions: z.array(LLMQuestionSchema)
});

function createSystemPrompt(category: Category, briefSummary?: string): string {
  let categoryFocus = '';
  if (category === 'technical') categoryFocus = 'technical skills, coding, and technical knowledge';
  else if (category === 'behavioural') categoryFocus = 'behavioral traits, past experiences, and soft skills (use STAR method format)';
  else if (category === 'system_design') categoryFocus = 'system design, architecture, and scalability';
  else if (category === 'company_fit') categoryFocus = 'company fit, culture, and values alignment';

  let prompt = `You are an expert technical interviewer. Generate a list of highly relevant interview questions focusing on ${categoryFocus}.
Your questions must be directly tied to the provided requirements by referencing their IDs in 'requirement_ids'.
Return a JSON object with a "questions" array. Each question should have:
- requirement_ids: array of requirement IDs this question tests
- category: "${category}"
- text: the interview question itself
- difficulty: 1 (easy), 2 (medium), or 3 (hard)
- answer_hint: a brief hint or key points you expect the candidate to hit

Respond with JSON only.`;

  if (category === 'company_fit' && briefSummary) {
    prompt += `\n\nEnsure questions are tailored to this company context: ${briefSummary}`;
  }

  return prompt;
}

export async function generateQuestions(
  requirements: Requirement[], 
  category: Category, 
  briefSummary?: string,
  discussions?: { title: string; content: string }[]
): Promise<Omit<Question, 'id'>[]> {
  // If system_design but no architecture requirements, we might want to skip, but this is handled by caller.
  if (requirements.length === 0) return [];

  const systemPrompt = createSystemPrompt(category, briefSummary);
  
  const reqsText = requirements.map(r => `[ID: ${r.id}] ${r.kind} - ${r.priority} - ${r.text}`).join('\n');
  
  // Inject randomness to ensure regeneration produces different results
  const randomSeed = Math.random().toString(36).substring(7);
  let userPrompt = `Generate ${category} questions that evaluate the following requirements:\n\n${reqsText}\n\nVariation seed: ${randomSeed}`;
  
  if (discussions && discussions.length > 0) {
    userPrompt += `\n\nAdditionally, here are some real interview discussions you can use for inspiration:\n`;
    userPrompt += discussions.map(d => `Title: ${d.title}\nContent: ${d.content}`).join('\n\n');
  }
  
  userPrompt += `\n\nIMPORTANT: Respond with JSON only. Do not include any other text.`;

  const result = await callLLM(systemPrompt, userPrompt, QuestionsExtractionSchema);
  return result.questions;
}

export async function generateAllQuestions(
  requirements: Requirement[],
  briefSummary?: string,
  isJunior: boolean = false,
  discussions?: { title: string; content: string }[]
): Promise<Question[]> {
  const categories: Category[] = ['technical', 'behavioural', 'company_fit'];
  if (!isJunior) {
    categories.push('system_design');
  }

  const results: Omit<Question, 'id'>[][] = [];
  for (const cat of categories) {
    const qs = await generateQuestions(requirements, cat, briefSummary, discussions);
    results.push(qs);
  }
  
  const allQuestions = results.flat();
  
  // Code assigns IDs
  return allQuestions.map((q, i) => ({
    ...q,
    id: `q${i + 1}`
  }));
}
