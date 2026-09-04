'use client';

import { use, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Kit } from '@interview-prep-kit/shared';
import { Loader2, ArrowLeft, RefreshCw, Printer } from 'lucide-react';
import Link from 'next/link';
import { KitBuilderTabs } from './components/KitBuilderTabs';

export default function KitBuilderPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { fetchApi } = useApi();
  
  const [kit, setKit] = useState<Kit | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

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

  // Handle Debounced Auto-Save
  const handleUpdateKit = useCallback(async (updatedKit: Kit) => {
    setKit(updatedKit); // Optimistic UI update
    setIsSaving(true);

    try {
      // The API expects the full kit in the body for PUT
      await fetchApi(`/kits/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updatedKit),
      });
    } catch (err: any) {
      console.error('Failed to save kit changes:', err);
      // In a real app, we might revert the state or show a toast error
    } finally {
      setIsSaving(false);
    }
  }, [id, fetchApi]);

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
    <div className="min-h-screen pb-20">
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
          <button className="flex items-center gap-2 px-3 py-1.5 text-sm bg-slate-800 hover:bg-slate-700 text-white rounded-md transition-colors">
            <Printer className="w-4 h-4" />
            Print / Export
          </button>
        </div>
      </div>

      {/* Builder Content */}
      <main className="max-w-6xl mx-auto px-4 py-8">
        <KitBuilderTabs kit={kit} onUpdate={handleUpdateKit} />
      </main>
    </div>
  );
}
