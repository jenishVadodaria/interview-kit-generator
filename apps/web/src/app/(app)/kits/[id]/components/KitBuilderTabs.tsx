'use client';

import { useState } from 'react';
import { Kit } from '@interview-prep-kit/shared';
import { Building2, MessageSquareText, BrainCircuit, CalendarDays, BarChart3, Zap } from 'lucide-react';
import { RoleBriefSection } from './RoleBriefSection';
import { QuestionsSection } from './QuestionsSection';
import { FlashcardsSection } from './FlashcardsSection';
import { ScheduleSection } from './ScheduleSection';
import { PracticeModeSection } from './PracticeModeSection';
import { ReadinessScoreSection } from './ReadinessScoreSection';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

const TABS = [
  { id: 'brief', label: 'Role & Brief', icon: Building2 },
  { id: 'questions', label: 'Questions', icon: MessageSquareText },
  { id: 'flashcards', label: 'Flashcards', icon: BrainCircuit },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
  { id: 'practice', label: 'Practice', icon: Zap },
  { id: 'readiness', label: 'Readiness', icon: BarChart3 },
];

export function KitBuilderTabs({ kit, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState('brief');

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-800">
        <div className="flex gap-1 px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 pt-2 px-3 text-sm font-medium transition-all border-b-2 whitespace-nowrap cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
                {/* Highlight badge for new features */}
                {(tab.id === 'practice' || tab.id === 'readiness') && (
                  <span className="ml-1 text-[9px] font-bold px-1.5 py-0.5 rounded-full bg-indigo-500/20 text-indigo-400 uppercase tracking-wider">
                    New
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-2 animate-in fade-in duration-300">
        {activeTab === 'brief' && <RoleBriefSection kit={kit} onUpdate={onUpdate} />}
        {activeTab === 'questions' && <QuestionsSection kit={kit} onUpdate={onUpdate} />}
        {activeTab === 'flashcards' && <FlashcardsSection kit={kit} onUpdate={onUpdate} onNavigate={setActiveTab} />}
        {activeTab === 'schedule' && <ScheduleSection kit={kit} onNavigate={setActiveTab} />}
        {activeTab === 'practice' && <PracticeModeSection kit={kit} />}
        {activeTab === 'readiness' && <ReadinessScoreSection kit={kit} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
