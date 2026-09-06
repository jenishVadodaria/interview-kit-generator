import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import { runKitPipeline, PipelineInput } from '@interview-prep-kit/pipeline';
import { BatchInputSchema, BatchOutput, BatchOutputItem, sanitizeKitForOutput, Kit } from '@interview-prep-kit/shared';

import crypto from 'crypto';

async function evaluate() {
  const args = process.argv.slice(2);
  let inputFile = '';
  let outputFile = '';

  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--input' && args[i + 1]) {
      inputFile = args[i + 1] || '';
      i++;
    } else if (args[i] === '--output' && args[i + 1]) {
      outputFile = args[i + 1] || '';
      i++;
    }
  }

  if (!inputFile || !outputFile) {
    console.error('Usage: tsx evaluate.ts --input <file> --output <file>');
    process.exit(1);
  }

  const rawData = JSON.parse(fs.readFileSync(path.resolve(process.cwd(), inputFile), 'utf-8'));
  const batchInput = BatchInputSchema.parse(rawData);

  const outputKits: BatchOutputItem[] = [];

  console.log(`Starting batch evaluation for ${batchInput.length} items...`);

  for (const item of batchInput) {
    console.log(`\nEvaluating Case: ${item.id} (${item.company_url})`);
    const kitId = crypto.randomUUID();
    
    const input: PipelineInput = {
      jd: item.jd,
      companyUrl: item.company_url,
      days: item.days,
      userId: 'cli-user',
      kitId,
      allowPrivateUrls: true // Local test sites
    };

    try {
      const generator = runKitPipeline(input);
      let finalKit: Kit | undefined;
      while (true) {
        const res = await generator.next();
        if (res.done) {
          finalKit = res.value;
          break;
        } else {
          console.log(`[${res.value.step}] ${res.value.status}: ${res.value.message}`);
        }
      }
      
      outputKits.push({
        id: item.id,
        status: 'ok',
        kit: sanitizeKitForOutput(finalKit!)
      });
      
    } catch (err: any) {
      console.error(`Failed on case ${item.id}:`, err.message);
      outputKits.push({
        id: item.id,
        status: 'failed',
        kit: null,
        error: {
          code: 'GENERATION_FAILED',
          message: err.message
        }
      } as any);
    }
  }

  const output: BatchOutput = {
    version: '1.0',
    generated_at: new Date().toISOString(),
    kits: outputKits
  };

  fs.writeFileSync(path.resolve(process.cwd(), outputFile), JSON.stringify(output, null, 2), 'utf-8');
  console.log(`\nBatch complete. Output written to ${outputFile}`);
}

evaluate().catch(err => {
  console.error(err);
  process.exit(1);
});
