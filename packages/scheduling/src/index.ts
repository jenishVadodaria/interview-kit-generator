import { Requirement, Question, Flashcard, ScheduleDay } from '@interview-prep-kit/shared';

// Helper to determine question time
function getEstimatedMinutes(difficulty: number): number {
  if (difficulty === 1) return 15;
  if (difficulty === 2) return 25;
  if (difficulty === 3) return 40;
  return 20;
}

// Priority mapping for sorting
const priorityMap = {
  'must_know': 3,
  'good_to_know': 2,
  'nice_to_have': 1
};

export function buildSchedule(
  requirements: Requirement[], 
  questions: Question[], 
  flashcards: Flashcard[], 
  daysAvailable: number
): ScheduleDay[] {
  // 1. Score and sort questions based on requirement priority and difficulty
  const reqPriorityMap = new Map<string, number>();
  for (const req of requirements) {
    reqPriorityMap.set(req.id, priorityMap[req.priority as keyof typeof priorityMap] || 1);
  }

  const scoredQuestions = questions.map(q => {
    // A question's priority score is the max priority of the requirements it covers
    let maxPrio = 1;
    for (const reqId of q.requirement_ids) {
      const p = reqPriorityMap.get(reqId) || 1;
      if (p > maxPrio) maxPrio = p;
    }
    // High priority reqs first, then hard questions first
    const score = (maxPrio * 100) + (q.difficulty * 10);
    return { question: q, score };
  });

  scoredQuestions.sort((a, b) => b.score - a.score);

  // 2. Initialize schedule days
  const schedule: ScheduleDay[] = Array.from({ length: daysAvailable }, (_, i) => ({
    day: i + 1,
    focus: `Day ${i + 1} Focus`,
    question_ids: [],
    flashcard_ids: [],
    estimated_minutes: 0,
  }));

  // 3. Distribute questions (round-robin style to balance load)
  let dayIndex = 0;
  for (const sq of scoredQuestions) {
    const day = schedule[dayIndex]!;
    day.question_ids.push(sq.question.id);
    day.estimated_minutes += getEstimatedMinutes(sq.question.difficulty);
    
    dayIndex = (dayIndex + 1) % daysAvailable;
  }

  // 4. Distribute flashcards evenly across all days
  let flashcardIndex = 0;
  for (const f of flashcards) {
    const day = schedule[flashcardIndex]!;
    day.flashcard_ids.push(f.id);
    day.estimated_minutes += 2; 
    
    flashcardIndex = (flashcardIndex + 1) % daysAvailable;
  }

  // 5. Generate focus strings based on the day's questions
  const CATEGORY_LABELS: Record<string, string> = {
    technical: 'Technical',
    behavioural: 'Behavioural',
    system_design: 'System Design',
    company_fit: 'Company Fit',
  };

  for (const day of schedule) {
    if (day.question_ids.length > 0) {
      const dayQuestions = questions.filter(q => day.question_ids.includes(q.id));
      const categories = new Set(dayQuestions.map(q => q.category));
      const labels = Array.from(categories).map(c => CATEGORY_LABELS[c] || c);
      day.focus = labels.join(' & ') + ' Practice';
    } else if (day.flashcard_ids.length > 0) {
      day.focus = 'Flashcard Review';
    } else {
      day.focus = 'Rest Day / Free Review';
    }
  }

  return schedule;
}
