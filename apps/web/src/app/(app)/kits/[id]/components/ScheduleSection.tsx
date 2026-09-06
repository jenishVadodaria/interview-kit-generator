'use client';

import { Kit } from '@interview-prep-kit/shared';
import { CalendarDays, Clock, CheckCircle2 } from 'lucide-react';

interface Props {
  kit: Kit;
  onNavigate: (tab: string) => void;
}

export function ScheduleSection({ kit, onNavigate }: Props) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 mb-6">
        <CalendarDays className="w-5 h-5 text-indigo-400" />
        <h2 className="text-xl font-bold text-white">Your Preparation Schedule</h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {kit.schedule.map((day) => (
          <div key={day.day} className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 relative overflow-hidden group hover:border-indigo-500/30 transition-colors">
            {/* Day Badge */}
            <div className="absolute top-0 right-0 bg-indigo-500/10 text-indigo-400 text-xs font-bold px-3 py-1 rounded-bl-lg border-b border-l border-indigo-500/20">
              Day {day.day}
            </div>

            <h3 className="text-lg font-bold text-white mt-2 mb-1">{day.focus}</h3>
            
            <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
              <Clock className="w-4 h-4" />
              ~{day.estimated_minutes} minutes
            </div>

            {day.question_ids.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">Practice Questions</h4>
                <ul className="space-y-1.5">
                  {day.question_ids.map(qid => {
                    const q = kit.questions.find(x => x.id === qid);
                    if (!q) return null;
                    return (
                      <li 
                        key={qid} 
                        onClick={() => {
                          window.location.hash = `#question-${qid}`;
                          onNavigate('questions');
                          setTimeout(() => {
                            const el = document.getElementById(`question-${qid}`);
                            if (el) {
                              el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                              el.classList.add('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950');
                              setTimeout(() => el.classList.remove('ring-2', 'ring-indigo-500', 'ring-offset-2', 'ring-offset-slate-950'), 2000);
                            }
                          }, 100);
                        }}
                        className="flex gap-2 items-start text-sm text-slate-300 hover:text-indigo-400 cursor-pointer transition-colors py-1 rounded-lg hover:bg-slate-800/50"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-600" />
                        <span className="line-clamp-2" title={q.text}>{q.text}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}

            {day.question_ids.length === 0 && day.flashcard_ids.length === 0 && (
              <p className="text-sm text-slate-500 italic">Rest day — review at your own pace.</p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
