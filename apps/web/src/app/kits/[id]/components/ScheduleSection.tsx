'use client';

import { Kit, ScheduleDay } from '@interview-prep-kit/shared';
import { CalendarDays, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

export function ScheduleSection({ kit }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Your Preparation Schedule</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {kit.schedule.map((day) => (
          <div key={day.day} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden group">
            {/* Day Badge */}
            <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-indigo-500/20">
              Day {day.day}
            </div>

            <h3 className="text-lg font-bold text-white mt-2 mb-1">{day.focus}</h3>
            
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-6">
              <Clock className="w-4 h-4" />
              ~{day.estimated_minutes} minutes
            </div>

            <div className="space-y-4">
              {day.question_ids.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Practice Questions</h4>
                  <ul className="space-y-2">
                    {day.question_ids.map(qid => {
                      const q = kit.questions.find(x => x.id === qid);
                      if (!q) return null;
                      return (
                        <li key={qid} className="flex gap-2 items-start text-sm text-slate-300">
                          <CheckCircle2 className="w-4 h-4 text-slate-600 shrink-0 mt-0.5 group-hover:text-indigo-400 transition-colors" />
                          <span className="line-clamp-2" title={q.text}>{q.text}</span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              {day.flashcard_ids.length > 0 && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Flashcard Review</h4>
                  <p className="text-sm text-slate-300 flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-slate-600 group-hover:text-indigo-400 transition-colors" />
                    Review {day.flashcard_ids.length} flashcards
                  </p>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
