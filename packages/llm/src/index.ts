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

  const result = await model.generateContent(userPrompt);
  const text = result.response.text();
  
  try {
    const json = JSON.parse(text);
    return zodSchema.parse(json);
  } catch (error) {
    console.error('LLM parsing failed:', text);
    throw error;
  }
}
