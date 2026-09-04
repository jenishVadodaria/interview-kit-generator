'use client';

import { useState } from 'react';
import { Kit } from '@interview-prep-kit/shared';
import { Building2, ListChecks, MessageSquareText, BrainCircuit, CalendarDays } from 'lucide-react';
import { RoleBriefSection } from './RoleBriefSection';
import { QuestionsSection } from './QuestionsSection';
import { FlashcardsSection } from './FlashcardsSection';
import { ScheduleSection } from './ScheduleSection';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

const TABS = [
  { id: 'brief', label: 'Role & Brief', icon: Building2 },
  { id: 'questions', label: 'Questions', icon: MessageSquareText },
  { id: 'flashcards', label: 'Flashcards', icon: BrainCircuit },
  { id: 'schedule', label: 'Schedule', icon: CalendarDays },
];

export function KitBuilderTabs({ kit, onUpdate }: Props) {
  const [activeTab, setActiveTab] = useState('brief');

  return (
    <div className="flex flex-col gap-6">
      {/* Tab Navigation */}
      <div className="flex overflow-x-auto hide-scrollbar border-b border-slate-800">
        <div className="flex gap-8 px-2">
          {TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 pb-4 pt-2 text-sm font-medium transition-all border-b-2 whitespace-nowrap ${
                  isActive
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tab Content */}
      <div className="mt-2 animate-in fade-in duration-300">
        {activeTab === 'brief' && <RoleBriefSection kit={kit} onUpdate={onUpdate} />}
        {activeTab === 'questions' && <QuestionsSection kit={kit} onUpdate={onUpdate} />}
        {activeTab === 'flashcards' && <FlashcardsSection kit={kit} onUpdate={onUpdate} />}
        {activeTab === 'schedule' && <ScheduleSection kit={kit} onUpdate={onUpdate} />}
      </div>
    </div>
  );
}
