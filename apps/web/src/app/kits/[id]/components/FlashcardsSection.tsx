'use client';

import { Kit, Flashcard } from '@interview-prep-kit/shared';
import { useState } from 'react';
import { BrainCircuit, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/Toast';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

export function FlashcardsSection({ kit, onUpdate }: Props) {
  const { fetchApi } = useApi();
  const { addToast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleFlashcardUpdate = (id: string, updates: Partial<Flashcard>) => {
    const newCards = kit.flashcards.map(f => f.id === id ? { ...f, ...updates } : f);
    onUpdate({ ...kit, flashcards: newCards });
  };

  const handleDelete = (id: string) => {
    const newCards = kit.flashcards.filter(f => f.id !== id);
    onUpdate({ ...kit, flashcards: newCards });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await fetchApi(`/kits/${kit.id}/regenerate/flashcards`, { method: 'POST' });
      onUpdate({ ...kit, flashcards: result.flashcards, schedule: result.schedule });
      addToast('Flashcards regenerated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to regenerate flashcards', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Spaced Repetition Flashcards</h2>
          <span className="text-sm font-medium text-slate-400">{kit.flashcards.length} cards</span>
        </div>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isRegenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Regenerate</>
          )}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kit.flashcards.map(card => (
          <FlashcardItem
            key={card.id}
            card={card}
            onUpdate={handleFlashcardUpdate}
            onDelete={() => handleDelete(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FlashcardItem({ card, onUpdate, onDelete }: { card: Flashcard, onUpdate: (id: string, updates: Partial<Flashcard>) => void, onDelete: () => void }) {
  const [front, setFront] = useState(card.front);
  const [back, setBack] = useState(card.back);

  const handleBlur = () => {
    if (front !== card.front || back !== card.back) {
      onUpdate(card.id, { front, back });
    }
  };

  return (
    <div className="group bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden transition-all hover:border-indigo-500/30">
      <div className="p-4 border-b border-slate-800/50 bg-slate-800/20">
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs font-semibold text-indigo-400 uppercase tracking-wider">Front (Question)</span>
          <button
            onClick={onDelete}
            className="text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
        <textarea
          value={front}
          onChange={(e) => setFront(e.target.value)}
          onBlur={handleBlur}
          className="w-full bg-transparent text-white font-medium resize-none focus:outline-none focus:bg-slate-950/50 p-2 -ml-2 rounded-lg border border-transparent focus:border-indigo-500/30 transition-colors"
          rows={3}
        />
      </div>

      <div className="p-4">
        <div className="mb-2">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">Back (Answer)</span>
        </div>
        <textarea
          value={back}
          onChange={(e) => setBack(e.target.value)}
          onBlur={handleBlur}
          className="w-full bg-transparent text-slate-300 resize-none focus:outline-none focus:bg-slate-950/50 p-2 -ml-2 rounded-lg border border-transparent focus:border-emerald-500/30 transition-colors"
          rows={4}
        />
      </div>
    </div>
  );
}
