import { Router } from 'express';
import { z } from 'zod';
import { requireAuth } from '../middleware/require-auth.js';
import { KitRepository, PracticeSessionRepository } from '@interview-prep-kit/persistence';
import { runKitPipeline, PipelineInput } from '@interview-prep-kit/pipeline';
import crypto from 'crypto';
import { computeReadinessScore } from '@interview-prep-kit/shared';
import { generateAllQuestions, generateFlashcards } from '@interview-prep-kit/generation';
import { buildSchedule } from '@interview-prep-kit/scheduling';

export const kitRouter: Router = Router();
const repository = new KitRepository();
const practiceRepo = new PracticeSessionRepository();

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

// --- Section Regeneration ---
// Regenerates questions or flashcards while preserving pinned/edited items.
kitRouter.post('/:id/regenerate/:section', async (req, res) => {
  try {
    const { id, section } = req.params;
    const validSections = ['questions', 'flashcards'];
    if (!validSections.includes(section)) {
      res.status(400).json({ error: `Invalid section. Must be one of: ${validSections.join(', ')}` });
      return;
    }

    const kit = await repository.getKitByIdAndUserId(id, req.session.userId!);
    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    if (section === 'questions') {
      // Identify pinned questions (ones the user edited/pinned)
      const pinnedQuestions = (kit.questions as any[]).filter((q: any) => q._pinned === true);
      const pinnedIds = new Set(pinnedQuestions.map((q: any) => q.id));

      // Generate fresh questions
      const freshQuestions = await generateAllQuestions(
        kit.requirements,
        kit.company_brief?.summary,
        false
      );

      // Merge: keep pinned in place, replace unpinned with fresh
      const merged: any[] = [];
      let freshIdx = 0;
      for (const existing of kit.questions as any[]) {
        if (pinnedIds.has(existing.id)) {
          merged.push(existing); // keep pinned
        } else if (freshIdx < freshQuestions.length) {
          merged.push({ ...freshQuestions[freshIdx], _source: 'generated', _pinned: false });
          freshIdx++;
        }
      }
      // Append any remaining fresh questions
      while (freshIdx < freshQuestions.length) {
        merged.push({ ...freshQuestions[freshIdx], _source: 'generated', _pinned: false });
        freshIdx++;
      }

      // Reassign IDs to maintain sequential order
      const reIdedQuestions = merged.map((q, i) => ({ ...q, id: `q${i + 1}` }));

      // Rebuild schedule with new questions
      const newSchedule = buildSchedule(kit.requirements, reIdedQuestions, kit.flashcards, kit.days_available);

      await repository.updateKit(id, req.session.userId!, {
        questions: reIdedQuestions,
        schedule: newSchedule,
      });

      res.json({ success: true, questions: reIdedQuestions, schedule: newSchedule });

    } else if (section === 'flashcards') {
      const pinnedFlashcards = (kit.flashcards as any[]).filter((f: any) => f._pinned === true);
      const pinnedIds = new Set(pinnedFlashcards.map((f: any) => f.id));

      const freshFlashcards = await generateFlashcards(kit.requirements, kit.questions);

      const merged: any[] = [];
      let freshIdx = 0;
      for (const existing of kit.flashcards as any[]) {
        if (pinnedIds.has(existing.id)) {
          merged.push(existing);
        } else if (freshIdx < freshFlashcards.length) {
          merged.push({ ...freshFlashcards[freshIdx], _source: 'generated', _pinned: false });
          freshIdx++;
        }
      }
      while (freshIdx < freshFlashcards.length) {
        merged.push({ ...freshFlashcards[freshIdx], _source: 'generated', _pinned: false });
        freshIdx++;
      }

      const reIdedFlashcards = merged.map((f, i) => ({ ...f, id: `f${i + 1}` }));

      // Rebuild schedule with new flashcards
      const newSchedule = buildSchedule(kit.requirements, kit.questions, reIdedFlashcards, kit.days_available);

      await repository.updateKit(id, req.session.userId!, {
        flashcards: reIdedFlashcards,
        schedule: newSchedule,
      });

      res.json({ success: true, flashcards: reIdedFlashcards, schedule: newSchedule });
    }
  } catch (error: any) {
    console.error('Failed to regenerate section:', error);
    res.status(500).json({ error: error.message || 'Internal server error' });
  }
});

// --- Readiness Score ---
// Computes and stores the interview readiness score for a kit.
kitRouter.get('/:id/readiness', async (req, res) => {
  try {
    const kit = await repository.getKitByIdAndUserId(req.params.id, req.session.userId!);
    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    const sessions = await practiceRepo.getSessionsByKitId(req.params.id, req.session.userId!);
    const score = computeReadinessScore(kit, sessions);

    // Persist the computed score on the kit
    await repository.updateKit(req.params.id, req.session.userId!, {
      readiness_score: score,
    });

    res.json({ readiness_score: score });
  } catch (error) {
    console.error('Failed to compute readiness:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// --- Export One-Pager ---
// Returns structured data for a printable/copyable interview prep summary.
kitRouter.get('/:id/export', async (req, res) => {
  try {
    const kit = await repository.getKitByIdAndUserId(req.params.id, req.session.userId!);
    if (!kit) {
      res.status(404).json({ error: 'Kit not found' });
      return;
    }

    const sessions = await practiceRepo.getSessionsByKitId(req.params.id, req.session.userId!);
    const score = computeReadinessScore(kit, sessions);

    // Top 5 hardest questions
    const hardestQuestions = [...kit.questions]
      .sort((a, b) => b.difficulty - a.difficulty)
      .slice(0, 5)
      .map((q) => ({
        id: q.id,
        category: q.category,
        difficulty: q.difficulty,
        text: q.text,
        answer_hint: q.answer_hint,
      }));

    // Schedule overview (first 3 days + last day)
    const scheduleOverview = kit.schedule.length <= 4
      ? kit.schedule
      : [...kit.schedule.slice(0, 3), kit.schedule[kit.schedule.length - 1]!];

    const exportData = {
      job_title: kit.job_title,
      company_url: kit.company_url,
      company_name: kit.company_brief.company_name,
      days_available: kit.days_available,
      created_at: kit.created_at,
      readiness_score: score,
      stats: {
        total_requirements: kit.requirements.length,
        total_questions: kit.questions.length,
        total_flashcards: kit.flashcards.length,
        total_practice_sessions: sessions.length,
      },
      top_hard_questions: hardestQuestions,
      weak_spots: score.weak_spots,
      schedule_overview: scheduleOverview,
      company_brief_summary: kit.company_brief.summary,
    };

    res.json(exportData);
  } catch (error) {
    console.error('Failed to export kit:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});
