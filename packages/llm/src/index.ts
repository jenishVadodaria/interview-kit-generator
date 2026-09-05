import { GoogleGenerativeAI, Schema } from '@google/generative-ai';
import { z } from 'zod';

// --- Provider Clients ---
const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY'] || '');

// Gemini 3.5 Flash Lite is confirmed available on the account
const GEMINI_MODEL = 'gemini-3.5-flash-lite';
// Mistral free tier: open-mistral-nemo, no credit card required
const MISTRAL_MODEL = 'open-mistral-nemo';
const MISTRAL_API_URL = 'https://api.mistral.ai/v1/chat/completions';

/**
 * Unified LLM wrapper: Gemini primary, Mistral fallback.
 * All LLM calls are made sequentially by the pipeline — never in parallel —
 * to respect the Gemini free tier (15 RPM).
 *
 * Retry logic:
 * - On 429/503: waits for server-hinted retryDelay, otherwise exponential backoff.
 * - On non-retryable Gemini error: falls back to Mistral.
 * - On Mistral failure: throws with a clear message.
 */
export async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  zodSchema: z.ZodType<T>,
  geminiSchema?: Schema
): Promise<T> {
  const maxRetries = parseInt(process.env['LLM_RETRY_MAX'] ?? '5', 10);
  const baseBackoff = parseInt(process.env['LLM_BACKOFF_BASE_MS'] ?? '4000', 10);

  // --- Primary: Gemini ---
  if (process.env['GEMINI_API_KEY']) {
    const generationConfig: any = { responseMimeType: 'application/json' };
    if (geminiSchema) {
      generationConfig.responseSchema = geminiSchema;
    }

    const model = genAI.getGenerativeModel({
      model: GEMINI_MODEL,
      systemInstruction: systemPrompt,
      generationConfig,
    });

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const result = await model.generateContent(userPrompt);
        const raw = result.response.text();
        // Strip markdown fences Gemini sometimes adds despite JSON mode
        const text = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/i, '').trim();
        const json = JSON.parse(text);
        return zodSchema.parse(json);
      } catch (error: any) {
        const isRateLimit = error?.status === 429 || error?.message?.includes('429');
        const isOverloaded = error?.status === 503 || error?.message?.includes('503');
        const isJsonError = error instanceof SyntaxError;
        // Retry on: rate limits, overload, or malformed/truncated JSON from model
        const isRetryable = isRateLimit || isOverloaded || isJsonError;

        if (isJsonError) {
          console.warn(`Gemini returned malformed JSON. Retrying... (attempt ${attempt}/${maxRetries})`);
        }

        if (!isRetryable || attempt === maxRetries) {
          console.warn(`Gemini failed after ${attempt} attempt(s). Falling back to Mistral. ${error.message}`);
          break; // fall through to Mistral only on hard failures
        }

        const delayMs = isJsonError
          ? 1000 + Math.random() * 500  // short delay for JSON errors
          : computeDelay(error, baseBackoff, attempt); // server-hinted delay for rate limits
        console.warn(`Gemini retrying in ${Math.round(delayMs)}ms (attempt ${attempt}/${maxRetries})`);
        await sleep(delayMs);
      }
    }
  }

  // --- Fallback: Mistral ---
  if (!process.env['MISTRAL_API_KEY']) {
    throw new Error('No working LLM provider. Set GEMINI_API_KEY and/or MISTRAL_API_KEY in .env');
  }

  console.info('Attempting Mistral fallback...');
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const res = await fetch(MISTRAL_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${process.env['MISTRAL_API_KEY']}`,
        },
        body: JSON.stringify({
          model: MISTRAL_MODEL,
          response_format: { type: 'json_object' },
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: userPrompt },
          ],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        const err = new Error((body as any).message ?? `Mistral HTTP ${res.status}`);
        (err as any).status = res.status;
        throw err;
      }

      const data = await res.json() as any;
      const text = data.choices?.[0]?.message?.content ?? '{}';
      const json = JSON.parse(text);
      return zodSchema.parse(json);
    } catch (error: any) {
      const isRateLimit = error?.status === 429;
      if (!isRateLimit || attempt === maxRetries) {
        console.error('Mistral (fallback) call failed:', error.message);
        throw error;
      }
      const delayMs = baseBackoff * Math.pow(2, attempt - 1) + Math.random() * 1000;
      console.warn(`Mistral rate limited. Retrying in ${Math.round(delayMs)}ms (attempt ${attempt}/${maxRetries})`);
      await sleep(delayMs);
    }
  }

  throw new Error('LLM call failed after exhausting all providers and retries.');
}

// --- Helpers ---

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function computeDelay(error: any, baseBackoff: number, attempt: number): number {
  let delayMs = baseBackoff * Math.pow(2, attempt - 1) + Math.random() * 1000;

  // Gemini: parse RetryInfo from errorDetails
  if (error?.errorDetails && Array.isArray(error.errorDetails)) {
    const retryInfo = error.errorDetails.find(
      (d: any) => d['@type'] === 'type.googleapis.com/google.rpc.RetryInfo'
    );
    if (retryInfo?.retryDelay) {
      const parsedSeconds = parseFloat(retryInfo.retryDelay);
      if (!isNaN(parsedSeconds)) {
        delayMs = parsedSeconds * 1000 + 1500; // server-hinted + 1.5s buffer
      }
    }
  }

  return delayMs;
}
