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
 * Four equally-weighted components (25% each):
 * 1. Coverage — what % of requirements have at least one question
 * 2. Schedule — what % of available days have actual study content
 * 3. Practice — what % of flashcards have been practiced at least once
 * 4. Confidence — average confidence rating across all practice / 5
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

  for (const session of practiceSessions) {
    for (const rating of session.flashcard_ratings) {
      practicedFlashcardIds.add(rating.flashcard_id);
      const existing = confidenceByFlashcard.get(rating.flashcard_id) || [];
      existing.push(rating.confidence);
      confidenceByFlashcard.set(rating.flashcard_id, existing);
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

  // --- Overall (equal 25% weights) ---
  const overall = Math.round(
    (coveragePct * 0.25) +
    (schedulePct * 0.25) +
    (practicePct * 0.25) +
    (confidenceAvg * 0.25)
  );

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
  if (coveragePct >= 90) parts.push('Excellent question coverage');
  else if (coveragePct >= 70) parts.push('Good question coverage');
  else parts.push(`Coverage needs work (${coveragePct}%)`);

  if (practicePct >= 80) parts.push('strong practice completion');
  else if (practicePct >= 40) parts.push('moderate practice progress');
  else if (practicePct > 0) parts.push('low practice — keep studying');
  else parts.push('no practice sessions yet');

  if (confidenceAvg >= 80) parts.push('high confidence');
  else if (confidenceAvg >= 50) parts.push('growing confidence');
  else if (totalRatings > 0) parts.push('confidence needs improvement');

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
