// Pure-code readiness score algorithm. Zero LLM calls, fully deterministic.
import {
  Kit,
  ReadinessScore,
  WeakSpot,
  PracticeSession,
  Category,
} from './schema.js';

/**
 * Computes the Interview Readiness Score from kit data + practice sessions.
 *
 * Weights:
 *   - Confidence (50%) — average confidence rating across all practiced flashcards, scaled to 0-100
 *   - Practice Completion (30%) — what % of flashcards have been practiced at least once
 *   - Content Coverage (10%) — what % of requirements have at least one question (auto-generated)
 *   - Schedule Density (10%) — what % of available days have actual study content
 *
 * IMPORTANT: If no practice sessions exist, the overall score is 0.
 * Coverage and Schedule are auto-generated and should not inflate the score.
 *
 * Also identifies "weak spots": requirements whose questions are hard (avg
 * difficulty ≥ 2.5) AND whose related flashcards have never been practiced.
 */
export function computeReadinessScore(
  kit: Kit,
  practiceSessions: PracticeSession[]
): ReadinessScore {
  // --- 1. Coverage ---
  const allReqIds = new Set(kit.requirements.map((r) => r.id));
  const coveredReqIds = new Set<string>();
  for (const q of kit.questions) {
    for (const rid of q.requirement_ids) {
      if (allReqIds.has(rid)) coveredReqIds.add(rid);
    }
  }
  const coveragePct = allReqIds.size > 0
    ? Math.round((coveredReqIds.size / allReqIds.size) * 100)
    : 0;

  // --- 2. Schedule Adherence ---
  const daysWithContent = kit.schedule.filter(
    (d) => d.question_ids.length > 0 || d.flashcard_ids.length > 0
  ).length;
  const schedulePct = kit.days_available > 0
    ? Math.round((daysWithContent / kit.days_available) * 100)
    : 0;

  // --- 3. Practice ---
  const practicedFlashcardIds = new Set<string>();
  const confidenceByFlashcard = new Map<string, number[]>();

  // Only count flashcards that still exist in the kit
  const validFlashcardIds = new Set(kit.flashcards.map(f => f.id));

  for (const session of practiceSessions) {
    for (const rating of session.flashcard_ratings) {
      if (validFlashcardIds.has(rating.flashcard_id)) {
        practicedFlashcardIds.add(rating.flashcard_id);
        const existing = confidenceByFlashcard.get(rating.flashcard_id) || [];
        existing.push(rating.confidence);
        confidenceByFlashcard.set(rating.flashcard_id, existing);
      }
    }
  }

  const practicePct = kit.flashcards.length > 0
    ? Math.round((practicedFlashcardIds.size / kit.flashcards.length) * 100)
    : 0;

  // --- 4. Confidence ---
  let totalConfidence = 0;
  let totalRatings = 0;
  for (const ratings of confidenceByFlashcard.values()) {
    // Use only the latest rating per flashcard for the average
    totalConfidence += ratings[ratings.length - 1]!;
    totalRatings++;
  }
  const confidenceAvg = totalRatings > 0
    ? Math.round((totalConfidence / totalRatings / 5) * 100)
    : 0;

  // --- Overall (Weighted) ---
  // If no practice sessions exist at all, the score is 0.
  // Coverage and schedule are auto-generated and should not inflate the score.
  const hasPractice = practiceSessions.length > 0;
  const rawOverall = hasPractice
    ? (confidenceAvg * 0.50) +
      (practicePct * 0.30) +
      (coveragePct * 0.10) +
      (schedulePct * 0.10)
    : 0;
  const overall = Math.min(100, Math.round(rawOverall));

  // --- Per-category breakdown ---
  const categories: Category[] = ['technical', 'behavioural', 'system_design', 'company_fit'];
  const byCategory: Record<string, number> = {};

  for (const cat of categories) {
    const catQuestions = kit.questions.filter((q) => q.category === cat);
    if (catQuestions.length === 0) continue;

    // Category score = % of requirements covered by questions in this category
    const catReqIds = new Set<string>();
    for (const q of catQuestions) {
      for (const rid of q.requirement_ids) catReqIds.add(rid);
    }
    byCategory[cat] = allReqIds.size > 0
      ? Math.round((catReqIds.size / allReqIds.size) * 100)
      : 0;
  }

  // --- Weak spots ---
  const weakSpots: WeakSpot[] = [];

  // Build a map: requirement_id → avg question difficulty
  const reqDifficulty = new Map<string, number[]>();
  for (const q of kit.questions) {
    for (const rid of q.requirement_ids) {
      const existing = reqDifficulty.get(rid) || [];
      existing.push(q.difficulty);
      reqDifficulty.set(rid, existing);
    }
  }

  // Build a set of requirement_ids whose related flashcards have been practiced
  const practicedReqIds = new Set<string>();
  for (const fc of kit.flashcards) {
    if (practicedFlashcardIds.has(fc.id)) {
      for (const rid of fc.requirement_ids) {
        practicedReqIds.add(rid);
      }
    }
  }

  for (const req of kit.requirements) {
    const difficulties = reqDifficulty.get(req.id);
    if (!difficulties || difficulties.length === 0) {
      // Uncovered requirement — definitely a weak spot
      weakSpots.push({
        requirement_id: req.id,
        reason: 'No questions cover this requirement',
      });
      continue;
    }

    const avgDiff = difficulties.reduce((a, b) => a + b, 0) / difficulties.length;
    const isPracticed = practicedReqIds.has(req.id);

    if (avgDiff >= 2.5 && !isPracticed) {
      weakSpots.push({
        requirement_id: req.id,
        reason: `High difficulty (avg ${avgDiff.toFixed(1)}) with no flashcard practice`,
      });
    }
  }

  // --- Gap count ---
  const gapCount = allReqIds.size - coveredReqIds.size;

  // --- Rationale ---
  const parts: string[] = [];

  // Start with practice status first (the most important thing)
  if (!hasPractice) {
    parts.push('No practice sessions yet — start practicing to build your score');
  } else {
    if (confidenceAvg >= 80) parts.push('High confidence from practice');
    else if (confidenceAvg >= 50) parts.push('Growing confidence — keep practicing');
    else parts.push(`Low confidence (${confidenceAvg}%) — focus on weak areas`);

    if (practicePct >= 80) parts.push('strong study completion');
    else if (practicePct >= 40) parts.push('moderate study progress');
    else parts.push('most flashcards still unreviewed');
  }

  if (coveragePct < 70) {
    parts.push(`content coverage needs work (${coveragePct}%)`);
  }

  if (weakSpots.length > 0) {
    parts.push(`${weakSpots.length} weak spot${weakSpots.length > 1 ? 's' : ''} identified`);
  }

  const rationale = parts.join('. ') + '.';

  return {
    overall,
    coverage_pct: coveragePct,
    schedule_pct: schedulePct,
    practice_pct: practicePct,
    confidence_avg: confidenceAvg,
    by_category: byCategory,
    weak_spots: weakSpots,
    gap_count: gapCount,
    rationale,
  };
}
