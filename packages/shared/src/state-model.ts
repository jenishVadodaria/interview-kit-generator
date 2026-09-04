// Tracks per-item edit/pin state for the regeneration preservation system.
// _source: whether the item came from the LLM or was manually edited.
// _pinned: if true, regeneration skips this item entirely.
export type ItemSource = 'generated' | 'edited';

export interface EditableItemMeta {
  _source: ItemSource;
  _pinned: boolean;
}

// Auto-pins an item when the user makes any edit.
export function markAsEdited<T extends EditableItemMeta>(item: T): T {
  return { ...item, _source: 'edited', _pinned: true };
}

// Returns a new array where only non-pinned items are replaced by fresh items.
// Pinned items keep their original position and content.
export function mergeWithPinned<T extends EditableItemMeta>(
  existing: T[],
  fresh: T[]
): T[] {
  const merged: T[] = [];
  let freshIndex = 0;
  for (const item of existing) {
    if (item._pinned) {
      merged.push(item);
    } else if (freshIndex < fresh.length) {
      merged.push(fresh[freshIndex++]!);
    }
    // If fresh is exhausted, unpinned slot is simply dropped
  }
  // Append any leftover fresh items beyond existing length
  while (freshIndex < fresh.length) {
    merged.push(fresh[freshIndex++]!);
  }
  return merged;
}

