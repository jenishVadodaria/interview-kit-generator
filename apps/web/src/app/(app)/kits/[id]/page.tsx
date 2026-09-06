'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Kit } from '@interview-prep-kit/shared';
import { Loader2, ArrowLeft, Printer, X, AlertTriangle } from 'lucide-react';
import Link from 'next/link';
import { KitBuilderTabs } from './components/KitBuilderTabs';

// --- Export Modal ---
interface ExportData {
  job_title: string;
  company_name: string;
  company_url: string;
  days_available: number;
  created_at: string;
  readiness_score: {
    overall: number;
    coverage_pct: number;
    schedule_pct: number;
    practice_pct: number;
    confidence_avg: number;
    weak_spots: { requirement_id: string; reason: string }[];
    rationale: string;
  };
  stats: {
    total_requirements: number;
    total_questions: number;
    total_flashcards: number;
    total_practice_sessions: number;
  };
  top_hard_questions: {
    id: string;
    category: string;
    difficulty: number;
    text: string;
    answer_hint: string;
  }[];
  weak_spots: { requirement_id: string; reason: string }[];
  schedule_overview: {
    day: number;
    focus: string;
    estimated_minutes: number;
    question_ids: string[];
    flashcard_ids: string[];
  }[];
  company_brief_summary: string;
}

function ExportModal({ data, onClose }: { data: ExportData; onClose: () => void }) {
  const scoreColor =
    data.readiness_score.overall >= 75 ? 'text-emerald-400' :
    data.readiness_score.overall >= 50 ? 'text-amber-400' :
    'text-red-400';

  return (
    <div
      className="fixed inset-0 z-[9997] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm print:hidden"
      onClick={onClose}
    >
      <div
        className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl max-w-3xl w-full max-h-[90vh] overflow-y-auto break-words"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="sticky top-0 bg-slate-900 border-b border-slate-800 px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="text-lg font-bold text-white">{data.job_title}</h2>
            <p className="text-sm text-slate-400">{data.company_name}</p>
          </div>
          <div className="flex items-center gap-3 no-print">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors cursor-pointer"
            >
              <Printer className="w-4 h-4" />
              Print
            </button>
            <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1 cursor-pointer">
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-8 print:p-4">
          {/* Stats Row */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Requirements', value: data.stats.total_requirements },
              { label: 'Questions', value: data.stats.total_questions },
              { label: 'Flashcards', value: data.stats.total_flashcards },
              { label: 'Practice Sessions', value: data.stats.total_practice_sessions },
            ].map((s) => (
              <div key={s.label} className="bg-slate-800/50 rounded-xl p-4 text-center">
                <p className="text-2xl font-black text-white">{s.value}</p>
                <p className="text-xs text-slate-400 mt-1">{s.label}</p>
              </div>
            ))}
          </div>

          {/* Readiness Score */}
          <div className="bg-slate-800/30 border border-slate-700 rounded-xl p-5">
            <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-4">Readiness Score</h3>
            <div className="flex items-center gap-6">
              <p className={`text-5xl font-black ${scoreColor}`}>{Math.min(100, data.readiness_score.overall)}</p>
              <div className="flex-1 space-y-2">
                {[
                  { label: 'Coverage', value: data.readiness_score.coverage_pct },
                  { label: 'Practice', value: data.readiness_score.practice_pct },
                  { label: 'Confidence', value: data.readiness_score.confidence_avg },
                ].map((c) => (
                  <div key={c.label} className="flex items-center gap-3">
                    <span className="text-xs text-slate-400 w-20">{c.label}</span>
                    <div className="flex-1 h-1.5 bg-slate-700 rounded-full">
                      <div
                        className={`h-full rounded-full ${c.value >= 75 ? 'bg-emerald-500' : c.value >= 50 ? 'bg-amber-500' : 'bg-red-500'}`}
                        style={{ width: `${c.value}%` }}
                      />
                    </div>
                    <span className="text-xs font-bold text-white w-8 text-right">{Math.round(c.value)}%</span>
                  </div>
                ))}
              </div>
            </div>
            {data.readiness_score.rationale && (
              <p className="text-sm text-slate-400 mt-4 italic">"{data.readiness_score.rationale}"</p>
            )}
          </div>

          {/* Top Hard Questions */}
          {data.top_hard_questions.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Top 5 Hardest Questions</h3>
              <div className="space-y-3">
                {data.top_hard_questions.map((q) => (
                  <div key={q.id} className="bg-slate-800/30 border border-slate-700 rounded-xl p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-red-500/10 text-red-400">
                        Difficulty {q.difficulty}
                      </span>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-700 text-slate-400">
                        {q.category.replace('_', ' ')}
                      </span>
                    </div>
                    <p className="text-sm font-medium text-white mb-2">{q.text}</p>
                    <p className="text-xs text-slate-400">💡 {q.answer_hint}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Weak Spots */}
          {data.weak_spots.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-amber-400 mb-3 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                Weak Spots
              </h3>
              <div className="space-y-2">
                {data.weak_spots.map((ws, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 bg-amber-500/5 border border-amber-500/20 rounded-lg">
                    <span className="text-xs font-bold text-amber-400 shrink-0 mt-0.5">{ws.requirement_id}</span>
                    <p className="text-sm text-slate-300">{ws.reason}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Schedule Overview */}
          {data.schedule_overview.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold uppercase tracking-wider text-slate-400 mb-3">Schedule Snapshot</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {data.schedule_overview.map((day) => (
                  <div key={day.day} className="flex items-center justify-between bg-slate-800/30 border border-slate-700 rounded-xl px-4 py-3">
                    <div>
                      <p className="text-xs font-bold text-indigo-400 mb-0.5">Day {day.day}</p>
                      <p className="text-sm text-slate-300">{day.focus}</p>
                    </div>
                    <p className="text-xs text-slate-500">~{day.estimated_minutes}m</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function PrintableExport({ data }: { data: ExportData }) {
  return (
    <div className="hidden print:block bg-white text-black font-sans p-8 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold mb-1">{data.job_title}</h1>
      <h2 className="text-xl text-gray-600 mb-6">{data.company_name}</h2>
      
      <div className="mb-8 pb-4 border-b border-gray-300">
        <p className="mb-2"><strong>Company URL:</strong> {data.company_url}</p>
        <p className="mb-2"><strong>Time Available:</strong> {data.days_available} Days</p>
        <p><strong>Overall Readiness:</strong> {Math.round(data.readiness_score.overall)}%</p>
      </div>

      <div className="mb-8">
        <h3 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2">Preparation Stats</h3>
        <ul className="list-disc pl-5">
          <li>Requirements Mapped: {data.stats.total_requirements}</li>
          <li>Practice Questions: {data.stats.total_questions}</li>
          <li>Flashcards: {data.stats.total_flashcards}</li>
          <li>Practice Sessions Completed: {data.stats.total_practice_sessions}</li>
        </ul>
      </div>

      {data.schedule_overview.length > 0 && (
        <div className="mb-8">
          <h3 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2">Schedule Overview</h3>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr>
                <th className="border border-gray-300 p-2 bg-gray-100">Day</th>
                <th className="border border-gray-300 p-2 bg-gray-100">Focus</th>
                <th className="border border-gray-300 p-2 bg-gray-100">Est. Time</th>
              </tr>
            </thead>
            <tbody>
              {data.schedule_overview.map(day => (
                <tr key={day.day}>
                  <td className="border border-gray-300 p-2 text-center">{day.day}</td>
                  <td className="border border-gray-300 p-2">{day.focus}</td>
                  <td className="border border-gray-300 p-2 text-center">{day.estimated_minutes}m</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data.top_hard_questions.length > 0 && (
        <div>
          <h3 className="text-xl font-bold border-b border-gray-300 mb-4 pb-2">Top Questions to Master</h3>
          <ol className="list-decimal pl-5 space-y-4">
            {data.top_hard_questions.map((q, i) => (
              <li key={q.id}>
                <strong>{q.text}</strong>
                <p className="text-gray-600 italic mt-1 text-sm">Hint: {q.answer_hint}</p>
              </li>
            ))}
          </ol>
        </div>
      )}
    </div>
  );
}

// --- Main Page ---
export default function KitBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchApi } = useApi();

  const [kit, setKit] = useState<Kit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportData, setExportData] = useState<ExportData | null>(null);

  useEffect(() => {
    const fetchKit = async () => {
      try {
        const data = await fetchApi(`/kits/${id}`);
        setKit(data.kit);
      } catch (err: any) {
        setError(err.message || 'Failed to load kit');
      } finally {
        setIsLoading(false);
      }
    };
    fetchKit();
  }, [id, fetchApi]);

  const handleUpdateKit = useCallback(async (updatedKit: Kit) => {
    setKit(updatedKit);
    setIsSaving(true);
    try {
      await fetchApi(`/kits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedKit),
      });
    } catch (err: any) {
      console.error('Failed to save kit changes:', err);
    } finally {
      setIsSaving(false);
    }
  }, [id, fetchApi]);

  const handleExport = async () => {
    setIsExporting(true);
    try {
      const data = await fetchApi(`/kits/${id}/export`);
      setExportData(data);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError('Export failed: ' + (err.message || 'Unknown error'));
    } finally {
      setIsExporting(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  if (error || !kit) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-bold text-red-400 mb-2">Error Loading Kit</h2>
        <p className="text-slate-400">{error}</p>
        <Link href="/dashboard" className="text-indigo-400 mt-4 inline-block hover:underline">
          Return to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen pb-20 print:hidden">
        {/* Export Modal */}
        {exportData && (
          <ExportModal data={exportData} onClose={() => setExportData(null)} />
        )}

        {/* Top Navigation Bar */}
        <div className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800 px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 -ml-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-xl font-bold text-white leading-tight">{kit.job_title}</h1>
              <p className="text-sm text-slate-400">{kit.company_brief.company_name}</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-xs text-slate-500 flex items-center gap-2">
              {isSaving ? (
                <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
              ) : (
                'All changes saved'
              )}
            </span>
            <button
              onClick={handleExport}
              disabled={isExporting}
              className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {isExporting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Printer className="w-4 h-4" />
              )}
              {isExporting ? 'Loading...' : 'Export'}
            </button>
          </div>
        </div>

        {/* Builder Content */}
        <main className="max-w-6xl mx-auto px-4 py-8">
          <KitBuilderTabs kit={kit} onUpdate={handleUpdateKit} />
        </main>
      </div>
      
      {exportData && <PrintableExport data={exportData} />}
    </>
  );
}
