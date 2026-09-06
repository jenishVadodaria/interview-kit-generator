'use client';

import { useState, useEffect } from 'react';
import { Kit, Question, Category } from '@interview-prep-kit/shared';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Trash2, Loader2, RefreshCw } from 'lucide-react';
import { useApi } from '@/hooks/useApi';
import { useToast } from '@/components/Toast';

interface Props {
  kit: Kit;
  onUpdate: (kit: Kit) => void;
}

const CATEGORIES: { id: Category; label: string }[] = [
  { id: 'technical', label: 'Technical' },
  { id: 'behavioural', label: 'Behavioural' },
  { id: 'system_design', label: 'System Design' },
  { id: 'company_fit', label: 'Company Fit' },
];

export function QuestionsSection({ kit, onUpdate }: Props) {
  const { fetchApi } = useApi();
  const { addToast } = useToast();
  const [activeCategory, setActiveCategory] = useState<Category>('technical');
  const [isRegenerating, setIsRegenerating] = useState(false);
  const questionsInCat = kit.questions.filter(q => q.category === activeCategory);

  useEffect(() => {
    const handleHash = () => {
      const hash = window.location.hash;
      if (hash && hash.startsWith('#question-')) {
        const qid = hash.replace('#question-', '');
        const q = kit.questions.find(x => x.id === qid);
        if (q && q.category !== activeCategory) {
          setActiveCategory(q.category);
        }
      }
    };
    handleHash();
    window.addEventListener('hashchange', handleHash);
    return () => window.removeEventListener('hashchange', handleHash);
  }, [kit.questions, activeCategory]);

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (over && active.id !== over.id) {
      const oldIndex = kit.questions.findIndex(q => q.id === active.id);
      const newIndex = kit.questions.findIndex(q => q.id === over.id);
      const newQuestions = arrayMove(kit.questions, oldIndex, newIndex);
      onUpdate({ ...kit, questions: newQuestions });
    }
  };

  const handleQuestionUpdate = (id: string, updates: Partial<Question>) => {
    const newQuestions = kit.questions.map(q => q.id === id ? { ...q, ...updates, _pinned: true } : q);
    onUpdate({ ...kit, questions: newQuestions });
  };

  const handleDelete = (id: string) => {
    const newQuestions = kit.questions.filter(q => q.id !== id);
    onUpdate({ ...kit, questions: newQuestions });
  };

  const handleRegenerate = async () => {
    setIsRegenerating(true);
    try {
      const result = await fetchApi(`/kits/${kit.id}/regenerate/questions`, { method: 'POST' });
      onUpdate({ ...kit, questions: result.questions, schedule: result.schedule });
      addToast('Questions regenerated successfully!', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to regenerate questions', 'error');
    } finally {
      setIsRegenerating(false);
    }
  };

  const handleCategoryClick = (catId: Category) => {
    setActiveCategory(catId);
    if (window.location.hash.startsWith('#question-')) {
      window.history.replaceState(null, '', window.location.pathname + window.location.search);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header with regenerate button */}
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate-400">{kit.questions.length} questions across all categories</p>
        <button
          onClick={handleRegenerate}
          disabled={isRegenerating}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
        >
          {isRegenerating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Regenerating...</>
          ) : (
            <><RefreshCw className="w-4 h-4" /> Regenerate</>
          )}
        </button>
      </div>

      {/* Category Tabs */}
      <div className="flex flex-wrap gap-2">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategoryClick(cat.id)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeCategory === cat.id
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-900/50 text-slate-400 hover:bg-slate-800'
            }`}
          >
            {cat.label} ({kit.questions.filter(q => q.category === cat.id).length})
          </button>
        ))}
      </div>

      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={questionsInCat.map(q => q.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-4">
            {questionsInCat.length === 0 ? (
              <div className="text-center py-12 text-slate-500 bg-slate-900/20 rounded-2xl border border-slate-800 border-dashed">
                No questions in this category.
              </div>
            ) : (
              questionsInCat.map(q => (
                <SortableQuestionItem
                  key={q.id}
                  question={q}
                  onUpdate={handleQuestionUpdate}
                  onDelete={() => handleDelete(q.id)}
                />
              ))
            )}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}

function SortableQuestionItem({ question, onUpdate, onDelete }: { question: Question, onUpdate: (id: string, updates: Partial<Question>) => void, onDelete: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: question.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 10 : 1,
  };

  // Debounced input handlers
  const [text, setText] = useState(question.text);
  const [hint, setHint] = useState(question.answer_hint);

  const handleBlur = () => {
    if (text !== question.text || hint !== question.answer_hint) {
      onUpdate(question.id, { text, answer_hint: hint });
    }
  };

  return (
    <div
      ref={setNodeRef}
      id={`question-${question.id}`}
      style={style}
      className={`group flex items-start gap-3 bg-slate-900/50 backdrop-blur-xl border ${isDragging ? 'border-indigo-500 shadow-2xl scale-[1.02]' : 'border-slate-800'} rounded-2xl p-4 transition-all transition-colors duration-500`}
    >
      <button
        {...attributes}
        {...listeners}
        className="mt-2 text-slate-600 hover:text-slate-400 cursor-grab active:cursor-grabbing"
      >
        <GripVertical className="w-5 h-5" />
      </button>

      <div className="flex-1 space-y-3">
        <div>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-white font-medium p-2 -ml-2 bg-transparent hover:bg-slate-800/50 focus:bg-slate-800/80 rounded outline-none resize-y"
            rows={2}
            placeholder="Question text..."
          />
        </div>
        
        <div className="flex items-start gap-2">
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider shrink-0 mt-2">Hint</span>
          <textarea
            value={hint}
            onChange={(e) => setHint(e.target.value)}
            onBlur={handleBlur}
            className="w-full text-sm text-slate-400 leading-relaxed bg-transparent hover:bg-slate-800/50 focus:bg-slate-800/80 rounded p-2 -ml-2 outline-none resize-y"
            rows={2}
            placeholder="Answer hint..."
          />
        </div>

        <div className="flex items-center justify-between pt-2">
          <div className="flex gap-2">
            <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded uppercase tracking-wider">
              Diff: {question.difficulty}
            </span>
            <select 
              value={question.category}
              onChange={(e) => onUpdate(question.id, { category: e.target.value as Category })}
              className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded uppercase tracking-wider outline-none appearance-none cursor-pointer hover:bg-slate-700"
            >
              {CATEGORIES.map(c => <option key={c.id} value={c.id}>Move to {c.label}</option>)}
            </select>
          </div>
          
          <button 
            onClick={onDelete}
            className="text-slate-600 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100 cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
