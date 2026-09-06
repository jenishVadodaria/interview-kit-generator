'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { CheckCircle2, Circle, Loader2, XCircle } from 'lucide-react';
import Link from 'next/link';

interface ProgressEvent {
  step: string;
  status: 'running' | 'success' | 'failed' | 'ok';
  message: string;
}

const stepsList = [
  { id: 'extraction', label: 'Extracting Requirements' },
  { id: 'research', label: 'Researching Company' },
  { id: 'brief', label: 'Generating Brief' },
  { id: 'questions', label: 'Writing Questions' },
  { id: 'coverage', label: 'Checking Coverage' },
  { id: 'flashcards', label: 'Creating Flashcards' },
  { id: 'schedule', label: 'Building Schedule' }
];

export default function ProgressPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState<string>('extraction');
  const [error, setError] = useState<string>('');
  const [completedSteps, setCompletedSteps] = useState<Set<string>>(new Set());

  useEffect(() => {
    const token = localStorage.getItem('auth_token');
    const url = `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000'}/kits/${id}/progress${token ? `?token=${token}` : ''}`;
    
    const eventSource = new EventSource(url);

    eventSource.onmessage = (e) => {
      try {
        const data: ProgressEvent = JSON.parse(e.data);
        
        if (data.step === 'complete') {
          if (data.status === 'success') {
            router.push(`/kits/${id}`);
          } else {
            setError(data.message);
          }
          eventSource.close();
          return;
        }

        setCurrentStep(data.step);
        if (data.status === 'ok' || data.status === 'success') {
          setCompletedSteps(prev => new Set(prev).add(data.step));
        }

      } catch (err) {
        console.error('Failed to parse SSE data', err);
      }
    };

    eventSource.onerror = () => {
      setError('Connection to server lost. The generation might still be running.');
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [id, router]);

  return (
    <div className="max-w-2xl mx-auto py-12">
      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-8 shadow-2xl">
        <div className="text-center mb-10">
          <h1 className="text-2xl font-bold text-white mb-2">Generating your kit</h1>
          <p className="text-slate-400">This usually takes 60-90 seconds. We're reading the job description, crawling the company site, and putting together a tailored plan.</p>
        </div>

        {error ? (
          <div className="p-6 bg-red-500/10 border border-red-500/20 rounded-xl text-center space-y-4">
            <XCircle className="w-12 h-12 text-red-400 mx-auto" />
            <div>
              <h3 className="text-lg font-bold text-red-400 mb-1">Generation Failed</h3>
              <p className="text-sm text-red-300">{error}</p>
            </div>
            <div className="pt-2">
              <Link
                href="/kits/new"
                className="inline-block px-6 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
              >
                Try Again
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {stepsList.map((step, index) => {
              const isCompleted = completedSteps.has(step.id);
              const isCurrent = currentStep === step.id && !isCompleted;
              const isPending = !isCompleted && !isCurrent;
              
              // If it's a past step that didn't emit 'ok' for some reason, mark it complete if we are further along
              const currentIndex = stepsList.findIndex(s => s.id === currentStep);
              const isEffectivelyCompleted = isCompleted || (currentIndex > index && currentStep !== 'complete');

              return (
                <div key={step.id} className="flex items-center gap-4">
                  <div className="shrink-0 flex items-center justify-center w-8 h-8">
                    {isEffectivelyCompleted ? (
                      <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                    ) : isCurrent ? (
                      <Loader2 className="w-6 h-6 text-indigo-400 animate-spin" />
                    ) : (
                      <Circle className="w-6 h-6 text-slate-700" />
                    )}
                  </div>
                  
                  <div className={`text-sm font-medium transition-colors ${
                    isEffectivelyCompleted ? 'text-slate-300' 
                    : isCurrent ? 'text-indigo-300 font-bold' 
                    : 'text-slate-600'
                  }`}>
                    {step.label}
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
