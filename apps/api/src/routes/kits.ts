import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { KitRepository } from '@interview-prep-kit/persistence';
import { runKitPipeline, PipelineInput } from '@interview-prep-kit/pipeline';
import crypto from 'crypto';
import { generateIds } from '@interview-prep-kit/shared';

export const kitRouter: Router = Router();
const repository = new KitRepository();

kitRouter.use(requireAuth);

interface PendingGeneration {
  jd: string;
  companyUrl: string;
  days: number;
  userId: string;
}

const pendingGenerations = new Map<string, PendingGeneration>();

kitRouter.get('/', async (req, res) => {
  try {
    const kits = await repository.getKitsByUserId(req.session.userId!);
    res.json({ kits });
  } catch (error) {
    console.error('Failed to get kits:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

kitRouter.get('/:id', async (req, res) => {
  try {
    const kit = await repository.getKitByIdAndUserId(req.params.id, req.session.userId!);
    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }
    res.json({ kit });
  } catch (error) {
    console.error('Failed to get kit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

kitRouter.delete('/:id', async (req, res) => {
  try {
    const deleted = await repository.deleteKit(req.params.id, req.session.userId!);
    if (!deleted) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }
    res.json({ success: true });
  } catch (error) {
    console.error('Failed to delete kit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

kitRouter.put('/:id', async (req, res) => {
  try {
    // Assuming the body contains the entire updated kit
    const updatedKit = req.body;
    // Security check: ensure user owns the kit before updating
    const existingKit = await repository.getKitByIdAndUserId(req.params.id, req.session.userId!);
    if (!existingKit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }
    
    // In a real app we'd validate the incoming kit against KitSchema
    await repository.updateKit(req.params.id, req.session.userId!, updatedKit);
    res.json({ success: true, kit: updatedKit });
  } catch (error) {
    console.error('Failed to update kit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

kitRouter.post('/generate', async (req, res) => {
  try {
    const schema = z.object({
      jd: z.string().min(10).max(50000),
      companyUrl: z.string().url(),
      days: z.number().int().min(1).max(60)
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error });
      return;
    }

    const kitId = crypto.randomUUID();
    
    pendingGenerations.set(kitId, {
      jd: parsed.data.jd,
      companyUrl: parsed.data.companyUrl,
      days: parsed.data.days,
      userId: req.session.userId!
    });
    
    res.json({ kitId });
  } catch (error) {
    console.error('Failed to init generation:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Starting generation on SSE connect
kitRouter.get('/:id/progress', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.flushHeaders();

  const { id } = req.params;
  const pending = pendingGenerations.get(id);

  if (!pending) {
    res.write(`data: ${JSON.stringify({ step: 'complete', status: 'failed', message: 'Generation session not found or already completed' })}\n\n`);
    res.end();
    return;
  }

  // Ensure user owns this generation session
  if (pending.userId !== req.session.userId) {
    res.write(`data: ${JSON.stringify({ step: 'complete', status: 'failed', message: 'Unauthorized' })}\n\n`);
    res.end();
    return;
  }

  // Remove from pending map so it can't be started twice
  pendingGenerations.delete(id);

  const input: PipelineInput = {
    jd: pending.jd,
    companyUrl: pending.companyUrl,
    days: pending.days,
    userId: pending.userId,
    kitId: id
  };

  try {
    const generator = runKitPipeline(input);
    while (true) {
      const result = await generator.next();
      if (result.done) {
        // Pipeline complete, result.value is the generated Kit
        const kit = result.value;
        await repository.createKit(kit);
        res.write(`data: ${JSON.stringify({ step: 'complete', status: 'success', message: 'Kit saved.' })}\n\n`);
        break;
      } else {
        // It's a pipeline event
        res.write(`data: ${JSON.stringify(result.value)}\n\n`);
      }
    }
  } catch (err: any) {
    console.error('Pipeline error:', err);
    res.write(`data: ${JSON.stringify({ step: 'complete', status: 'failed', message: err.message })}\n\n`);
  }
  
  res.end();
});
