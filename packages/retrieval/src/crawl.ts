import { fetchWithPolicy } from './fetch-policy.js';
import { extractContent, type ExtractedPage, type ExtractedLink } from './extract.js';

export interface CrawlResult {
  url: string;
  page: ExtractedPage;
}

/**
 * Score a link based on its relevance to company information, hiring, or team.
 */
function scoreLink(link: ExtractedLink): number {
  const urlLower = link.href.toLowerCase();
  const textLower = link.text.toLowerCase();
  
  let score = 0;
  
  const highPriorityKeywords = ['about', 'team', 'careers', 'jobs', 'hiring', 'culture', 'company', 'engineering'];
  const mediumPriorityKeywords = ['blog', 'news', 'press', 'mission', 'values'];
  const negativeKeywords = ['login', 'signin', 'signup', 'register', 'terms', 'privacy', 'legal', 'contact'];

  if (highPriorityKeywords.some(kw => urlLower.includes(kw) || textLower.includes(kw))) score += 10;
  if (mediumPriorityKeywords.some(kw => urlLower.includes(kw) || textLower.includes(kw))) score += 5;
  if (negativeKeywords.some(kw => urlLower.includes(kw) || textLower.includes(kw))) score -= 10;

  return score;
}

export async function crawlCompanySite(
  companyUrl: string, 
  maxPages: number = 3,
  options: { allowPrivate?: boolean } = {}
): Promise<CrawlResult[]> {
  const visited = new Set<string>();
  const results: CrawlResult[] = [];
  const queue: { url: string; score: number }[] = [{ url: companyUrl, score: 100 }];

  while (queue.length > 0 && results.length < maxPages) {
    // Sort queue by score descending to crawl most relevant links first
    queue.sort((a, b) => b.score - a.score);
    const current = queue.shift()!;
    
    if (visited.has(current.url)) continue;
    visited.add(current.url);

    try {
      const fetchOpts: { allowPrivate?: boolean } = {};
      if (options.allowPrivate !== undefined) fetchOpts.allowPrivate = options.allowPrivate;
      const html = await fetchWithPolicy(current.url, fetchOpts);
      const page = extractContent(html, current.url);
      
      results.push({ url: current.url, page });

      // Add internal links to queue
      const origin = new URL(companyUrl).origin;
      for (const link of page.links) {
        try {
          const linkUrl = new URL(link.href);
          // Only crawl same origin, avoid fragments/query spam
          if (linkUrl.origin === origin) {
            const cleanUrl = linkUrl.origin + linkUrl.pathname;
            if (!visited.has(cleanUrl)) {
              queue.push({ url: cleanUrl, score: scoreLink(link) });
            }
          }
        } catch {
          // ignore invalid
        }
      }
    } catch (err) {
      console.warn(`Failed to crawl ${current.url}:`, err);
    }
  }

  return results;
}
