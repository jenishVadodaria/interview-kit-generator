'use client';

import { useState } from 'react';
import { Kit } from '@interview-prep-kit/shared';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/Toast';
import {
  BarChart3, Loader2, RefreshCw, AlertTriangle, TrendingUp,
  CheckCircle2, Target, BookOpen, Dumbbell, Heart,
} from 'lucide-react';

interface ReadinessScore {
  overall: number;
  coverage_pct: number;
  schedule_pct: number;
  practice_pct: number;
  confidence_avg: number;
  weak_spots: { requirement_id: string; reason: string }[];
  gap_count: number;
  rationale: string;
  by_category: Record<string, number>;
}

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

function ScoreCircle({ score }: { score: number }) {
  const color =
    score >= 75 ? 'text-emerald-400' :
    score >= 50 ? 'text-amber-400' :
    'text-red-400';

  const ringColor =
    score >= 75 ? 'stroke-emerald-400' :
    score >= 50 ? 'stroke-amber-400' :
    'stroke-red-400';

  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="absolute inset-0 w-full h-full -rotate-90" viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={radius} fill="none" stroke="currentColor" strokeWidth="8" className="text-slate-800" />
        <circle
          cx="60" cy="60" r={radius} fill="none"
          strokeWidth="8"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={`${ringColor} transition-all duration-1000`}
        />
      </svg>
      <div className="text-center">
        <span className={`text-3xl font-black ${color}`}>{score}</span>
        <p className="text-[10px] text-slate-500 font-medium">/ 100</p>
      </div>
    </div>
  );
}

function ScoreBar({ label, value, icon: Icon, color }: { label: string; value: number; icon: React.ElementType; color: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Icon className={`w-4 h-4 ${color}`} />
          <span className="text-sm font-medium text-slate-300">{label}</span>
        </div>
        <span className="text-sm font-bold text-white">{Math.round(value)}%</span>
      </div>
      <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-1000 ${
            value >= 75 ? 'bg-emerald-500' : value >= 50 ? 'bg-amber-500' : 'bg-red-500'
          }`}
          style={{ width: `${value}%` }}
        />
      </div>
    </div>
  );
}

export function ReadinessScoreSection({ kit, onUpdate }: Props) {
  const { fetchApi } = useApi();
  const { addToast } = useToast();
  const [score, setScore] = useState<ReadinessScore | null>(
    (kit.readiness_score as ReadinessScore) || null
  );
  const [isCalculating, setIsCalculating] = useState(false);

  const calculate = async () => {
    setIsCalculating(true);
    try {
      const data = await fetchApi(`/kits/${kit.id}/readiness`);
      const newScore = data.readiness_score as ReadinessScore;
      setScore(newScore);
      onUpdate({ ...kit, readiness_score: newScore });
      addToast('Readiness score updated!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to calculate score', 'error');
    } finally {
      setIsCalculating(false);
    }
  };

  const COMPONENTS = [
    { key: 'confidence_avg', label: 'Practice Confidence', icon: Heart, color: 'text-pink-400' },
    { key: 'practice_pct', label: 'Study Progress', icon: Dumbbell, color: 'text-amber-400' },
    { key: 'coverage_pct', label: 'Content Coverage (auto)', icon: Target, color: 'text-indigo-400' },
    { key: 'schedule_pct', label: 'Schedule Density (auto)', icon: BookOpen, color: 'text-violet-400' },
  ] as const;

  return (
    <div className="space-y-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <BarChart3 className="w-5 h-5 text-indigo-400" />
          <h2 className="text-xl font-bold text-white">Interview Readiness Score</h2>
        </div>
        <button
          onClick={calculate}
          disabled={isCalculating}
          className="flex items-center gap-2 px-4 py-2 text-sm font-medium bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isCalculating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Calculating...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> {score ? 'Recalculate' : 'Calculate Score'}</>
          )}
        </button>
      </div>

      {!score ? (
        /* Empty State */
        <div className="flex flex-col items-center justify-center py-20 text-center bg-slate-900/30 border border-dashed border-slate-800 rounded-2xl">
          <TrendingUp className="w-12 h-12 text-slate-600 mb-4" />
          <h3 className="text-lg font-semibold text-slate-400 mb-2">No score yet</h3>
          <p className="text-sm text-slate-500 max-w-sm">
            Complete some practice sessions, then calculate your readiness score to see how prepared you are.
          </p>
        </div>
      ) : (
        <>
          {/* Score Overview */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Big score */}
            <div className="flex flex-col items-center justify-center bg-slate-900/50 border border-slate-800 rounded-2xl p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">Overall Score</p>
              <ScoreCircle score={score.overall} />
              <p className="text-xs text-slate-500 mt-3 text-center">{score.gap_count} uncovered requirement{score.gap_count !== 1 ? 's' : ''}</p>
            </div>

            {/* Component bars */}
            <div className="md:col-span-2 bg-slate-900/50 border border-slate-800 rounded-2xl p-6 space-y-5">
              {COMPONENTS.map(({ key, label, icon, color }) => (
                <ScoreBar
                  key={key}
                  label={label}
                  value={score[key]}
                  icon={icon}
                  color={color}
                />
              ))}
            </div>
          </div>

          {/* Rationale */}
          <div className="bg-indigo-500/5 border border-indigo-500/20 rounded-2xl p-5">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-semibold text-indigo-300">Summary</h4>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">{score.rationale}</p>
          </div>

          {/* Weak Spots */}
          {score.weak_spots.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <h4 className="text-sm font-semibold text-amber-300 uppercase tracking-wider">
                  Weak Spots ({score.weak_spots.length})
                </h4>
              </div>
              <div className="space-y-2">
                {score.weak_spots.map((ws, i) => (
                  <div
                    key={i}
                    className="flex items-start gap-3 p-4 bg-amber-500/5 border border-amber-500/20 rounded-xl"
                  >
                    <span className="text-xs font-bold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded shrink-0 mt-0.5">
                      {ws.requirement_id}
                    </span>
                    <p className="text-sm text-slate-300">{ws.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
