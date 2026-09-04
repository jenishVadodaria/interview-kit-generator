import { GoogleGenerativeAI, Schema } from '@google/generative-ai';
import { z } from 'zod';

const genAI = new GoogleGenerativeAI(process.env['GEMINI_API_KEY'] || '');

/**
 * A basic wrapper for structured LLM calls using Gemini.
 * Maps Zod schema to Gemini schema if needed, but for simplicity we will just instruct the model to return JSON
 * and parse it. Gemini 2.0 Flash is very good at JSON.
 */
export async function callLLM<T>(
  systemPrompt: string,
  userPrompt: string,
  zodSchema: z.ZodType<T>,
  geminiSchema?: Schema
): Promise<T> {
  const generationConfig: any = {
    responseMimeType: 'application/json',
  };
  if (geminiSchema) {
    generationConfig.responseSchema = geminiSchema;
  }

  const model = genAI.getGenerativeModel({
    model: 'gemini-2.5-flash',
    systemInstruction: systemPrompt,
    generationConfig,
  });

  const maxRetries = parseInt(process.env['LLM_RETRY_MAX'] ?? '3', 10);
  const baseBackoff = parseInt(process.env['LLM_BACKOFF_BASE_MS'] ?? '4000', 10);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await model.generateContent(userPrompt);
      const text = result.response.text();
      const json = JSON.parse(text);
      return zodSchema.parse(json);
    } catch (error: any) {
      const isRateLimit = error?.status === 429 || error?.message?.includes('429');
      if (!isRateLimit || attempt === maxRetries) {
        console.error('LLM call failed:', error);
        throw error;
      }
      
      const jitter = Math.random() * 1000;
      const delayMs = baseBackoff * Math.pow(2, attempt - 1) + jitter;
      console.warn(`LLM rate limited. Retrying in ${Math.round(delayMs)}ms (attempt ${attempt}/${maxRetries})`);
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
  
  throw new Error('LLM call failed after max retries');
}
