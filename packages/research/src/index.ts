import { tavily } from '@tavily/core';

export interface InterviewDiscussion {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface ResearchResult {
  found: boolean;
  discussions: InterviewDiscussion[];
}

export async function searchInterviewDiscussion(companyName: string): Promise<ResearchResult> {
  if (!process.env['TAVILY_API_KEY']) {
    console.warn('No TAVILY_API_KEY provided. Skipping interview discussion search.');
    return { found: false, discussions: [] };
  }

  const client = tavily({ apiKey: process.env['TAVILY_API_KEY'] });

  try {
    const query = `${companyName} software engineer interview experience questions site:reddit.com OR site:glassdoor.com OR site:teamblind.com OR site:leetcode.com`;
    
    const response = await client.search(query, {
      searchDepth: 'basic',
      includeRawContent: false,
      maxResults: 5,
    });

    if (!response.results || response.results.length === 0) {
      return { found: false, discussions: [] };
    }

    const uniqueUrls = new Set<string>();
    const discussions: InterviewDiscussion[] = [];

    for (const result of response.results) {
      if (uniqueUrls.has(result.url)) continue;
      uniqueUrls.add(result.url);

      discussions.push({
        title: result.title,
        url: result.url,
        content: result.content,
        score: result.score
      });
    }

    return { found: true, discussions };

  } catch (err) {
    console.warn(`Tavily search failed for ${companyName}:`, err);
    return { found: false, discussions: [] };
  }
}
