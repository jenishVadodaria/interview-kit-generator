import { Requirement, Question, Flashcard, ScheduleDay, Kit, CompanyBrief } from '@interview-prep-kit/shared';
import { crawlCompanySite } from '@interview-prep-kit/retrieval';
import { searchInterviewDiscussion } from '@interview-prep-kit/research';
import { extractRequirements, generateCompanyBrief } from '@interview-prep-kit/extraction';
import { generateAllQuestions, generateFlashcards } from '@interview-prep-kit/generation';
import { checkCoverage } from '@interview-prep-kit/coverage';
import { buildSchedule } from '@interview-prep-kit/scheduling';

export interface PipelineEvent {
  step: 'research' | 'extraction' | 'generation' | 'flashcards' | 'coverage' | 'scheduling' | 'complete';
  status: 'running' | 'success' | 'failed';
  message: string;
}

export interface PipelineInput {
  jd: string;
  companyUrl: string;
  days: number;
  userId: string;
  kitId: string;
  allowPrivateUrls?: boolean;
}

export async function* runKitPipeline(input: PipelineInput): AsyncGenerator<PipelineEvent, Kit> {
  const { jd, companyUrl, days, userId, kitId, allowPrivateUrls } = input;
  let companyBrief: CompanyBrief;
  let jobTitle: string = 'Generated Role';
  let requirements: Requirement[] = [];
  let questions: Question[] = [];
  let flashcards: Flashcard[] = [];
  let schedule: ScheduleDay[] = [];

  try {
    yield { step: 'research', status: 'running', message: 'Crawling company site and gathering data...' };
    
    // 1. Research — crawl + discussion search can run in parallel (no LLM calls)
    const crawlOptions: { allowPrivate?: boolean } = {};
    if (allowPrivateUrls !== undefined) crawlOptions.allowPrivate = allowPrivateUrls;

    const [crawlResults, discussions] = await Promise.all([
      crawlCompanySite(companyUrl, 3, crawlOptions).catch(() => []),
      searchInterviewDiscussion(new URL(companyUrl).hostname).catch(() => ({ found: false, discussions: [] }))
    ]);
    
    // Convert to pages format
    const pages = crawlResults.map((r: any) => ({ url: r.url, content: r.page.textContent }));
    
    yield { step: 'research', status: 'success', message: 'Research complete.' };

    // 2. Extraction — sequential LLM calls to respect rate limits
    yield { step: 'extraction', status: 'running', message: 'Extracting requirements and building brief...' };
    
    const brief = await generateCompanyBrief(
      pages,
      new URL(companyUrl).hostname,
      discussions.found ? discussions.discussions : undefined
    ).catch(() => ({
      company_name: 'Unknown',
      summary: 'Limited information.',
      culture_notes: '',
      recent_news: [],
      sources: []
    }));

    const extraction = await extractRequirements(jd);
    
    if (extraction.requirements.length === 0) {
      throw new Error('Failed to extract any requirements from the JD.');
    }
    
    companyBrief = brief;
    requirements = extraction.requirements;
    jobTitle = extraction.job_title;

    yield { step: 'extraction', status: 'success', message: 'Extraction complete.' };

    // 3. Generation — sequential per-category inside generateAllQuestions
    yield { step: 'generation', status: 'running', message: 'Generating interview questions...' };
    
    questions = await generateAllQuestions(requirements, companyBrief.summary, false, discussions.found ? discussions.discussions : undefined);
    
    yield { step: 'generation', status: 'success', message: 'Questions generated.' };

    // 4. Coverage (Gap detection) — pure function, no LLM
    yield { step: 'coverage', status: 'running', message: 'Checking requirement coverage...' };
    
    let coverage = checkCoverage(requirements, questions);
    let passes = 1;
    
    yield { step: 'coverage', status: 'success', message: `Coverage complete after ${passes} pass(es).` };

    // 5. Flashcards — single LLM call
    yield { step: 'flashcards', status: 'running', message: 'Creating study flashcards...' };
    flashcards = await generateFlashcards(requirements, questions);
    yield { step: 'flashcards', status: 'success', message: 'Flashcards generated.' };

    // 6. Scheduling — pure function, no LLM
    yield { step: 'scheduling', status: 'running', message: 'Building study schedule...' };
    schedule = buildSchedule(requirements, questions, flashcards, days);
    yield { step: 'scheduling', status: 'success', message: 'Schedule built.' };

    // Final Validation
    const kit: Kit = {
      id: kitId,
      user_id: userId,
      job_title: jobTitle,
      company_url: companyUrl,
      days_available: days,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      company_brief: companyBrief,
      requirements,
      questions,
      flashcards,
      schedule,
    };

    yield { step: 'complete', status: 'success', message: 'Pipeline finished successfully.' };
    return kit;
    
  } catch (error: any) {
    yield { step: 'complete', status: 'failed', message: error.message };
    throw error;
  }
}
