// Generates sequential IDs with a prefix: generateIds('q', 3) → ['q1', 'q2', 'q3']
// IDs are always assigned by code, never by the LLM.
export function generateIds(prefix: string, count: number, startFrom = 1): string[] {
  return Array.from({ length: count }, (_, i) => `${prefix}${startFrom + i}`);
}

// Generates a single ID at a given position: nextId('r', 5) → 'r5'
export function nextId(prefix: string, index: number): string {
  return `${prefix}${index}`;
}
