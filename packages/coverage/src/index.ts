import { Requirement, Question } from '@interview-prep-kit/shared';

export interface CoverageReport {
  covered_requirement_ids: string[];
  uncovered_requirement_ids: string[];
  has_must_know_gaps: boolean;
}

export function checkCoverage(requirements: Requirement[], questions: Question[]): CoverageReport {
  const coveredSet = new Set<string>();

  for (const q of questions) {
    for (const reqId of q.requirement_ids) {
      coveredSet.add(reqId);
    }
  }

  const covered: string[] = [];
  const uncovered: string[] = [];
  let hasMustKnowGaps = false;

  for (const req of requirements) {
    if (coveredSet.has(req.id)) {
      covered.push(req.id);
    } else {
      uncovered.push(req.id);
      if (req.priority === 'must_know') {
        hasMustKnowGaps = true;
      }
    }
  }

  return {
    covered_requirement_ids: covered,
    uncovered_requirement_ids: uncovered,
    has_must_know_gaps: hasMustKnowGaps
  };
}
