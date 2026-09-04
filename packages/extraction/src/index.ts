import { z } from 'zod';
import { callLLM } from '@interview-prep-kit/llm';
import { CompanyBriefSchema, Requirement, KindEnum, PriorityEnum } from '@interview-prep-kit/shared';
import { generateIds } from '@interview-prep-kit/shared';

// We ask the LLM for requirements without IDs, then assign IDs in code.
const LLMRequirementSchema = z.object({
  text: z.string(),
  kind: KindEnum,
  priority: PriorityEnum
});

const RequirementsExtractionSchema = z.object({
  requirements: z.array(LLMRequirementSchema)
});

export async function extractRequirements(jdText: string): Promise<Requirement[]> {
  const systemPrompt = `You are an expert technical recruiter. Extract requirements from the provided job description.
Return a JSON object with a "requirements" array. Each requirement should have:
- text: concise requirement description
- kind: 'skill', 'experience', 'trait', or 'knowledge'
- priority: 'must_know', 'good_to_know', or 'nice_to_have'

Do not invent requirements. If the JD is very thin, extract only what is present.
Respond with JSON only.`;

  const userPrompt = `--- BEGIN JOB DESCRIPTION ---\n${jdText}\n--- END JOB DESCRIPTION ---`;

  const result = await callLLM(systemPrompt, userPrompt, RequirementsExtractionSchema);

  const requirements: Requirement[] = result.requirements.map((req: any, index: number) => ({
    id: `r${index + 1}`,
    ...req
  }));

  return requirements;
}

export async function generateCompanyBrief(pages: { url: string; content: string }[], companyName: string) {
  const systemPrompt = `You are a corporate researcher. Generate a company brief based ONLY on the provided context pages.
Return a JSON object with:
- company_name: Name of the company
- summary: A brief summary of the company
- culture_notes: Notes on engineering culture, values, etc.
- recent_news: Array of strings of recent news/initiatives
- sources: Array of URLs used as sources (only those provided in context that had useful info)

If the context contains little to no useful information, provide an honest "limited information" brief.
Respond with JSON only.`;

  let contextText = pages.map(p => `--- URL: ${p.url} ---\n${p.content}`).join('\n\n');
  if (!contextText) {
    contextText = 'No company pages could be retrieved.';
  }

  const userPrompt = `Company: ${companyName}\n\nContext Pages:\n${contextText}`;

  return await callLLM(systemPrompt, userPrompt, CompanyBriefSchema);
}
