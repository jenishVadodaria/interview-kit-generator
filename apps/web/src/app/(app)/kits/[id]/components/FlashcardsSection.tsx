'use client';

import { Kit, Flashcard } from '@interview-prep-kit/shared';
import { useState } from 'react';
import { BrainCircuit, Trash2, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/Toast';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
  onNavigate?: (tab: string) => void;
}

export function FlashcardsSection({ kit, onUpdate, onNavigate }: Props) {
  const { fetchApi } = useApi();
  const { addToast } = useToast();
  const [isRegenerating, setIsRegenerating] = useState(false);

  const handleDelete = (id: string) => {
    const newCards = kit.flashcards.filter(f => f.id !== id);
    onUpdate({ ...kit, flashcards: newCards });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      // Correct endpoint: POST /kits/:id/regenerate/flashcards
      const result = await fetchApi(`/kits/${kit.id}/regenerate/flashcards`, { method: 'POST' });
      onUpdate({ ...kit, flashcards: result.flashcards, schedule: result.schedule });
      addToast('Flashcards regenerated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to regenerate flashcards', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  if (kit.flashcards.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800">
        <BrainCircuit className="w-12 h-12 text-slate-600 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-white mb-2">No flashcards yet</h3>
        <p className="text-slate-400">Generate flashcards to start practicing.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BrainCircuit className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Flashcards</h2>
          <span className="text-sm text-slate-400">({kit.flashcards.length} cards)</span>
        </div>
        <div className="flex gap-3">
          {onNavigate && (
            <button
              onClick={() => onNavigate('practice')}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
            >
              Practice Now
            </button>
          )}
          <button
            onClick={handleRegenerate}
            disabled={isRegenerating}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 ${isRegenerating ? 'animate-spin' : ''}`} />
            Regenerate All
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-500">Click a card to flip it and reveal the answer.</p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kit.flashcards.map(card => (
          <FlashcardItem
            key={card.id}
            card={card}
            onDelete={() => handleDelete(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

function FlashcardItem({ card, onDelete }: { card: Flashcard, onDelete: () => void }) {
  const [isFlipped, setIsFlipped] = useState(false);

  return (
    <div className="group relative">
      {/* Delete button */}
      <button
        onClick={(e) => { e.stopPropagation(); onDelete(); }}
        className="absolute top-3 right-3 z-10 text-slate-600 hover:text-red-400 p-1.5 rounded-lg hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {/* Flip container */}
      <div
        className="cursor-pointer select-none"
        style={{ perspective: '1000px', height: '220px' }}
        onClick={() => setIsFlipped(f => !f)}
      >
        <div
          className="relative w-full h-full transition-all duration-500"
          style={{
            transformStyle: 'preserve-3d',
            transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-900/60 backdrop-blur-xl border border-slate-700 rounded-2xl hover:border-indigo-500/30 transition-colors"
            style={{ backfaceVisibility: 'hidden' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-indigo-400 mb-4">Front — Question</span>
            <p className="text-base font-medium text-white text-center leading-relaxed">{card.front}</p>
            <span className="text-[10px] text-slate-600 mt-4">Click to flip</span>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 flex flex-col items-start justify-start p-6 bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl overflow-y-auto"
            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
          >
            <span className="text-[10px] font-semibold uppercase tracking-widest text-emerald-400 mb-3">Back — Answer</span>
            <p className="text-sm text-slate-200 leading-relaxed">{card.back}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
