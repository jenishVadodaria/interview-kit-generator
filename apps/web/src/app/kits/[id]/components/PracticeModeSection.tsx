'use client';

import { useState, useEffect } from 'react';
import { Kit } from '@interview-prep-kit/shared';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/Toast';
import {
  BrainCircuit, RotateCcw, CheckCircle2, Loader2,
  ChevronLeft, ChevronRight, History, Play, Star,
} from 'lucide-react';

interface FlashcardRating {
  flashcard_id: string;
  confidence: number;
}

interface PastSession {
  id: string;
  created_at: string;
  flashcard_ratings: FlashcardRating[];
}

interface Props {
  kit: Kit;
}

type ViewMode = 'start' | 'study' | 'result' | 'history';

const CONFIDENCE_OPTIONS = [
  { value: 1, emoji: '😰', label: 'No idea' },
  { value: 2, emoji: '🤔', label: 'Vague' },
  { value: 3, emoji: '😐', label: 'Getting there' },
  { value: 4, emoji: '😊', label: 'Confident' },
  { value: 5, emoji: '🚀', label: 'Nailed it!' },
];

export function PracticeModeSection({ kit }: Props) {
  const { fetchApi } = useApi();
  const { addToast } = useToast();

  const [view, setView] = useState<ViewMode>('start');
  const [currentIdx, setCurrentIdx] = useState(0);
  const [isFlipped, setIsFlipped] = useState(false);
  const [ratings, setRatings] = useState<FlashcardRating[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [pastSessions, setPastSessions] = useState<PastSession[]>([]);
  const [isLoadingSessions, setIsLoadingSessions] = useState(false);

  const flashcards = kit.flashcards;
  const currentCard = flashcards[currentIdx];
  const progress = flashcards.length > 0 ? ((currentIdx) / flashcards.length) * 100 : 0;
  const rated = ratings.find((r) => r.flashcard_id === currentCard?.id);

  // Load past sessions
  useEffect(() => {
    const load = async () => {
      setIsLoadingSessions(true);
      try {
        const data = await fetchApi(`/practice/sessions?kitId=${kit.id}`);
        setPastSessions(data.sessions || []);
      } catch {
        // Silently fail — past sessions are optional display
      } finally {
        setIsLoadingSessions(false);
      }
    };
    load();
  }, [kit.id, fetchApi]);

  const startSession = () => {
    setCurrentIdx(0);
    setIsFlipped(false);
    setRatings([]);
    setView('study');
  };

  const handleFlip = () => setIsFlipped((f) => !f);

  const handleRate = (confidence: number) => {
    if (!currentCard) return;

    const newRating: FlashcardRating = {
      flashcard_id: currentCard.id,
      confidence,
    };

    setRatings((prev) => {
      const filtered = prev.filter((r) => r.flashcard_id !== currentCard.id);
      return [...filtered, newRating];
    });

    // Auto-advance after short delay
    setTimeout(() => {
      if (currentIdx + 1 < flashcards.length) {
        setCurrentIdx((i) => i + 1);
        setIsFlipped(false);
      } else {
        setView('result');
      }
    }, 250);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      const data = await fetchApi('/practice/sessions', {
        method: 'POST',
        body: JSON.stringify({
          kit_id: kit.id,
          flashcard_ratings: ratings,
        }),
      });
      setPastSessions((prev) => [data.session, ...prev]);
      addToast('Practice session saved!', 'success');
      setView('start');
    } catch (err: any) {
      addToast(err.message || 'Failed to save session', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const avgConfidence = ratings.length > 0
    ? (ratings.reduce((acc, r) => acc + r.confidence, 0) / ratings.length).toFixed(1)
    : '0';

  if (flashcards.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <BrainCircuit className="w-12 h-12 text-slate-600 mb-4" />
        <h3 className="text-lg font-semibold text-slate-400 mb-1">No flashcards yet</h3>
        <p className="text-sm text-slate-500">Generate your kit to get flashcards to practice with.</p>
      </div>
    );
  }

  /* ---------- START VIEW ---------- */
  if (view === 'start') {
    return (
      <div className="space-y-8 max-w-2xl mx-auto">
        {/* Hero */}
        <div className="bg-gradient-to-br from-indigo-500/10 to-violet-500/10 border border-indigo-500/20 rounded-2xl p-8 text-center">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/20 flex items-center justify-center mx-auto mb-4">
            <BrainCircuit className="w-8 h-8 text-indigo-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Practice Mode</h2>
          <p className="text-slate-400 mb-6 max-w-sm mx-auto">
            Go through all {flashcards.length} flashcards and rate your confidence on each one. Your progress is tracked over time.
          </p>
          <button
            onClick={startSession}
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-medium transition-all"
          >
            <Play className="w-4 h-4" />
            Start Session
          </button>
        </div>

        {/* Past Sessions */}
        <div>
          <div className="flex items-center gap-2 mb-4">
            <History className="w-4 h-4 text-slate-400" />
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider">Past Sessions</h3>
          </div>
          {isLoadingSessions ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-5 h-5 animate-spin text-indigo-400" />
            </div>
          ) : pastSessions.length === 0 ? (
            <p className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-800 rounded-xl">No sessions yet — complete your first practice above.</p>
          ) : (
            <div className="space-y-3">
              {pastSessions.map((session) => {
                const avg = session.flashcard_ratings.length > 0
                  ? (session.flashcard_ratings.reduce((a, r) => a + r.confidence, 0) / session.flashcard_ratings.length).toFixed(1)
                  : '—';
                return (
                  <div key={session.id} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-sm font-medium text-slate-300">
                        {new Date(session.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </p>
                      <p className="text-xs text-slate-500">{session.flashcard_ratings.length} cards rated</p>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Star className="w-4 h-4 text-amber-400" />
                      <span className="text-sm font-bold text-amber-300">{avg} / 5</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  /* ---------- STUDY VIEW ---------- */
  if (view === 'study' && currentCard) {
    return (
      <div className="max-w-2xl mx-auto space-y-6">
        {/* Progress bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-xs text-slate-500">
            <span>Card {currentIdx + 1} of {flashcards.length}</span>
            <span>{Math.round(progress)}% complete</span>
          </div>
          <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Flip card */}
        <div
          className="relative cursor-pointer select-none"
          style={{ perspective: '1200px', height: '280px' }}
          onClick={handleFlip}
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
              className="absolute inset-0 flex flex-col items-center justify-center p-8 bg-slate-900/60 backdrop-blur-xl border border-slate-700 rounded-2xl"
              style={{ backfaceVisibility: 'hidden' }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-indigo-400 mb-6">Question</span>
              <p className="text-xl font-semibold text-white text-center leading-relaxed">{currentCard.front}</p>
              <p className="text-xs text-slate-500 mt-8">Click to reveal answer</p>
            </div>

            {/* Back */}
            <div
              className="absolute inset-0 flex flex-col items-start justify-start p-8 bg-slate-900/80 backdrop-blur-xl border border-emerald-500/30 rounded-2xl overflow-y-auto"
              style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
            >
              <span className="text-xs font-semibold uppercase tracking-widest text-emerald-400 mb-4">Answer</span>
              <p className="text-base text-slate-200 leading-relaxed">{currentCard.back}</p>
            </div>
          </div>
        </div>

        {/* Confidence rating (visible only when flipped) */}
        <div className={`transition-all duration-300 ${isFlipped ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2 pointer-events-none'}`}>
          <p className="text-center text-sm text-slate-400 mb-4">How confident are you?</p>
          <div className="flex gap-2 justify-center flex-wrap">
            {CONFIDENCE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={(e) => { e.stopPropagation(); handleRate(opt.value); }}
                className={`flex flex-col items-center gap-1 px-4 py-3 rounded-xl border transition-all hover:scale-105 active:scale-95 ${
                  rated?.confidence === opt.value
                    ? 'bg-indigo-600 border-indigo-500 text-white'
                    : 'bg-slate-800/50 border-slate-700 text-slate-300 hover:border-indigo-500/50 hover:bg-slate-700'
                }`}
              >
                <span className="text-xl">{opt.emoji}</span>
                <span className="text-[10px] font-medium">{opt.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Navigation controls */}
        <div className="flex justify-between items-center pt-2">
          <button
            onClick={() => { setCurrentIdx((i) => Math.max(0, i - 1)); setIsFlipped(false); }}
            disabled={currentIdx === 0}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <button
            onClick={() => setView('start')}
            className="text-xs text-slate-500 hover:text-slate-300 transition-colors"
          >
            Quit session
          </button>
          <button
            onClick={() => { setCurrentIdx((i) => Math.min(flashcards.length - 1, i + 1)); setIsFlipped(false); }}
            disabled={currentIdx === flashcards.length - 1}
            className="flex items-center gap-1.5 text-sm text-slate-400 hover:text-white disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          >
            Skip <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    );
  }

  /* ---------- RESULT VIEW ---------- */
  if (view === 'result') {
    return (
      <div className="max-w-md mx-auto text-center space-y-8">
        <div className="bg-gradient-to-br from-emerald-500/10 to-indigo-500/10 border border-emerald-500/20 rounded-2xl p-8">
          <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-1">Session Complete!</h2>
          <p className="text-slate-400 text-sm">You rated {ratings.length} of {flashcards.length} cards.</p>

          <div className="mt-6 flex justify-center gap-8">
            <div>
              <p className="text-3xl font-bold text-white">{avgConfidence}</p>
              <p className="text-xs text-slate-400 mt-1">Avg Confidence</p>
            </div>
            <div>
              <p className="text-3xl font-bold text-white">{ratings.length}</p>
              <p className="text-xs text-slate-400 mt-1">Cards Rated</p>
            </div>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={() => setView('start')}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-sm font-medium transition-colors"
          >
            <RotateCcw className="w-4 h-4" /> Discard
          </button>
          <button
            onClick={handleSubmit}
            disabled={isSubmitting || ratings.length === 0}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? (
              <><Loader2 className="w-4 h-4 animate-spin" /> Saving...</>
            ) : (
              'Save Results'
            )}
          </button>
        </div>
      </div>
    );
  }

  return null;
}
