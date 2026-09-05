import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { KitRepository, PracticeSessionRepository } from '@interview-prep-kit/persistence';
import crypto from 'crypto';

export const practiceRouter: Router = Router();
const kitRepo = new KitRepository();
const sessionRepo = new PracticeSessionRepository();

practiceRouter.use(requireAuth);

// Create a new practice session (submit flashcard ratings after studying)
practiceRouter.post('/sessions', async (req, res) => {
  try {
    const schema = z.object({
      kit_id: z.string().min(1),
      flashcard_ratings: z.array(z.object({
        flashcard_id: z.string().min(1),
        confidence: z.number().int().min(1).max(5),
      })).min(1),
    });

    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: parsed.error.flatten() });
      return;
    }

    // Verify the user owns the kit
    const kit = await kitRepo.getKitByIdAndUserId(parsed.data.kit_id, req.session.userId!);
    if (!kit) {
      res.status(404).json({ error: 'Kit not found or unauthorized' });
      return;
    }

    // Validate that all flashcard_ids actually exist in the kit
    const kitFlashcardIds = new Set(kit.flashcards.map((f) => f.id));
    const invalidIds = parsed.data.flashcard_ratings
      .filter((r) => !kitFlashcardIds.has(r.flashcard_id))
      .map((r) => r.flashcard_id);

    if (invalidIds.length > 0) {
      res.status(400).json({
        error: `Invalid flashcard IDs: ${invalidIds.join(', ')}. They do not exist in this kit.`
      });
      return;
    }

    const session = {
      id: crypto.randomUUID(),
      kit_id: parsed.data.kit_id,
      user_id: req.session.userId!,
      created_at: new Date().toISOString(),
      flashcard_ratings: parsed.data.flashcard_ratings,
    };

    await sessionRepo.createSession(session);
    res.status(201).json({ success: true, session });
  } catch (error) {
    console.error('Failed to create practice session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// List all practice sessions for a specific kit
practiceRouter.get('/sessions', async (req, res) => {
  try {
    const kitId = req.query.kitId as string;
    if (!kitId) {
      res.status(400).json({ error: 'Query parameter "kitId" is required' });
      return;
    }

    // Verify user owns the kit
    const kit = await kitRepo.getKitByIdAndUserId(kitId, req.session.userId!);
    if (!kit) {
      res.status(404).json({ error: 'Kit not found or unauthorized' });
      return;
    }

    const sessions = await sessionRepo.getSessionsByKitId(kitId, req.session.userId!);
    res.json({ sessions });
  } catch (error) {
    console.error('Failed to list practice sessions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get a specific practice session by ID
practiceRouter.get('/sessions/:id', async (req, res) => {
  try {
    const session = await sessionRepo.getSessionById(req.params.id, req.session.userId!);
    if (!session) {
      res.status(404).json({ error: 'Practice session not found' });
      return;
    }
    res.json({ session });
  } catch (error) {
    console.error('Failed to get practice session:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
