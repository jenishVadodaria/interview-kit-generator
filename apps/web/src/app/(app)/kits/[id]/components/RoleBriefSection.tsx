'use client';

import { Kit, Requirement } from '@interview-prep-kit/shared';
import { ExternalLink, Sparkles, Building, ListChecks, CheckCircle2, Circle } from 'lucide-react';
import { useState, useEffect } from 'react';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

export function RoleBriefSection({ kit, onUpdate }: Props) {
  const [briefSummary, setBriefSummary] = useState(kit.company_brief.summary);
  const [cultureNotes, setCultureNotes] = useState(kit.company_brief.culture_notes);

  // Debounce saving
  useEffect(() => {
    const timer = setTimeout(() => {
      if (
        briefSummary !== kit.company_brief.summary ||
        cultureNotes !== kit.company_brief.culture_notes
      ) {
        onUpdate({
          ...kit,
          company_brief: {
            ...kit.company_brief,
            summary: briefSummary,
            culture_notes: cultureNotes,
          },
        });
      }
    }, 500);
    return () => clearTimeout(timer);
  }, [briefSummary, cultureNotes, kit, onUpdate]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Left Column: Company Brief */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <Building className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Company Brief</h2>
          </div>

          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Company Summary</label>
              <div className="w-full bg-slate-900/50 text-white p-4 rounded-xl border border-slate-700/50 whitespace-pre-wrap text-sm leading-relaxed">
                {briefSummary}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-400 mb-2">Culture & Interview Notes</label>
              <div className="w-full bg-slate-900/50 text-white p-4 rounded-xl border border-slate-700/50 whitespace-pre-wrap text-sm leading-relaxed">
                {cultureNotes}
              </div>
            </div>
          </div>
        </div>

        {/* Recent News */}
        {kit.company_brief.recent_news.length > 0 && (
          <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
            <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Recent News & Mentions</h3>
            <ul className="space-y-3">
              {kit.company_brief.recent_news.map((news, i) => (
                <li key={i} className="flex gap-3 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-800/50">
                  <Sparkles className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>{news}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Right Column: Requirements & Sources */}
      <div className="space-y-6">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-slate-800">
            <ListChecks className="w-5 h-5 text-indigo-400" />
            <h2 className="text-xl font-bold text-white">Role Requirements</h2>
          </div>

          <div className="space-y-4">
            {kit.requirements.map((req) => (
              <div key={req.id} className="flex gap-3 items-start">
                {req.priority === 'must_know' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                )}
                <div>
                  <p className="text-sm text-slate-200 leading-snug">{req.text}</p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded bg-slate-800 text-slate-400">
                      {req.kind}
                    </span>
                    <span className={`text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded ${
                      req.priority === 'must_know' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800 text-slate-400'
                    }`}>
                      {req.priority.replace('_', ' ')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sources */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6">
          <h3 className="text-sm font-bold text-white mb-4 uppercase tracking-wider text-slate-400">Sources Analyzed</h3>
          <ul className="space-y-2">
            {kit.company_brief.sources.map((url, i) => {
              try {
                const parsedUrl = new URL(url);
                // Remove trailing slash for cleaner look
                const path = parsedUrl.pathname === '/' ? '' : parsedUrl.pathname.replace(/\/$/, '');
                const displayUrl = parsedUrl.hostname + path;
                
                return (
                  <li key={i}>
                    <a href={url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-sm text-indigo-400 hover:text-indigo-300 transition-colors bg-slate-950/50 p-2 rounded-lg border border-slate-800/50 hover:border-indigo-500/30 group">
                      <ExternalLink className="w-4 h-4 shrink-0" />
                      <span className="truncate group-hover:underline" title={url}>{displayUrl}</span>
                    </a>
                  </li>
                );
              } catch {
                return null;
              }
            })}
          </ul>
        </div>
      </div>
    </div>
  );
}
