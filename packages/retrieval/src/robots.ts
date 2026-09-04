import robotsParser from 'robots-parser';

const robotsCache = new Map<string, any>();

export async function checkRobotsTxt(baseUrl: string, path: string): Promise<boolean> {
  const robotsUrl = new URL('/robots.txt', baseUrl).toString();
  
  if (!robotsCache.has(baseUrl)) {
    if (robotsCache.size > 100) {
      robotsCache.clear();
    }
    
    try {
      const response = await fetch(robotsUrl, { 
        headers: { 'User-Agent': 'InterviewPrepBot/1.0' } 
      });
      const text = response.ok ? await response.text() : '';
      const robots = robotsParser(robotsUrl, text);
      robotsCache.set(baseUrl, robots);
    } catch {
      // If fetching fails, we assume it's allowed
      robotsCache.set(baseUrl, robotsParser(robotsUrl, ''));
    }
  }

  const robots = robotsCache.get(baseUrl);
  const isAllowed = robots.isAllowed(new URL(path, baseUrl).toString(), 'InterviewPrepBot/1.0');
  
  // robots-parser returns undefined if not explicitly allowed or disallowed, which usually implies allowed.
  return isAllowed !== false;
}
