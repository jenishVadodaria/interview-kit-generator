import { z } from 'zod';
import { callLLM } from '@interview-prep-kit/llm';
import { CompanyBriefSchema, Requirement, KindEnum, PriorityEnum, CompanyBrief } from '@interview-prep-kit/shared';

// We ask the LLM for requirements without IDs, then assign IDs in code.
const LLMRequirementSchema = z.object({
  text: z.string(),
  kind: KindEnum,
  priority: PriorityEnum
});

const RequirementsExtractionSchema = z.object({
  job_title: z.string().describe('The primary job title or role described in the text'),
  requirements: z.array(LLMRequirementSchema)
});

export async function extractRequirements(jdText: string): Promise<{ requirements: Requirement[], job_title: string }> {
  const systemPrompt = `You are an expert technical recruiter. Extract requirements and the job title from the provided job description.
Return a JSON object with a "job_title" string and a "requirements" array. Each requirement should have:
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

  return { requirements, job_title: result.job_title };
}

export async function generateCompanyBrief(
  pages: { url: string; content: string }[], 
  companyName: string,
  discussions?: { title: string; url: string; content: string }[]
): Promise<CompanyBrief> {
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
  
  if (discussions && discussions.length > 0) {
    contextText += '\n\n--- FORUM DISCUSSIONS & COMMUNITY POSTS ---\n';
    contextText += discussions.map(d => `Title: ${d.title}\nURL: ${d.url}\nContent: ${d.content}`).join('\n\n');
  }

  if (!contextText.trim()) {
    contextText = 'No company pages or discussions could be retrieved.';
  }

  const userPrompt = `Company: ${companyName}\n\nContext:\n${contextText}`;

  return await callLLM(systemPrompt, userPrompt, CompanyBriefSchema);
}
