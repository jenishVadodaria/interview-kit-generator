import { validateUrl } from './validate-url.js';
import { checkRobotsTxt } from './robots.js';

export class FetchError extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'FetchError';
  }
}

export async function fetchWithPolicy(
  targetUrl: string,
  options: { allowPrivate?: boolean; maxRetries?: number; maxBytes?: number } = {}
): Promise<string> {
  const { maxRetries = 3, maxBytes = 5 * 1024 * 1024 } = options;
  const validateOptions: { allowPrivate?: boolean } = {};
  if (options.allowPrivate !== undefined) validateOptions.allowPrivate = options.allowPrivate;
  const parsed = validateUrl(targetUrl, validateOptions);

  const allowed = await checkRobotsTxt(parsed.origin, parsed.pathname + parsed.search);
  if (!allowed) {
    throw new FetchError(`Robots.txt disallowed access to ${targetUrl}`, 403);
  }

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(parsed.toString(), {
        headers: {
          'User-Agent': 'InterviewPrepBot/1.0',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          let delayMs = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          const retryAfter = response.headers.get('Retry-After');
          if (retryAfter) {
            const parsedRetry = parseInt(retryAfter, 10);
            if (!isNaN(parsedRetry)) {
              delayMs = parsedRetry * 1000;
            }
          }
          await new Promise(r => setTimeout(r, delayMs));
          continue; // retry
        }
      }

      if (!response.ok) {
        throw new FetchError(`HTTP ${response.status}: ${response.statusText}`, response.status);
      }

      const contentType = response.headers.get('content-type') || '';
      if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
        throw new FetchError(`Unsupported content type: ${contentType}`, 415);
      }

      const contentLength = response.headers.get('content-length');
      if (contentLength && parseInt(contentLength, 10) > maxBytes) {
        throw new FetchError(`Content too large: ${contentLength} bytes`, 413);
      }

      const text = await response.text();
      if (text.length > maxBytes) {
        throw new FetchError(`Content too large after download`, 413);
      }
      return text;
      
    } catch (error: any) {
      if (error.name === 'FetchError') throw error;
      if (attempt === maxRetries) throw new FetchError(error.message);
      // Wait before retry
      await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000 + Math.random() * 1000));
    }
  }

  throw new FetchError('Fetch failed after retries');
}
