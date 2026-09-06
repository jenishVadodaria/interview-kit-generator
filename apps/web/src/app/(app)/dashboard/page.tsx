'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useApi } from '@/hooks/useApi';
import { Loader2, Plus, Calendar, ExternalLink, Trash2 } from 'lucide-react';
import { Kit } from '@interview-prep-kit/shared';
import { ConfirmModal } from '@/components/ConfirmModal';
import { useToast } from '@/components/Toast';

export default function DashboardPage() {
  const [kits, setKits] = useState<Kit[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const { fetchApi } = useApi();
  const { addToast } = useToast();

  const fetchKits = async () => {
    try {
      setIsLoading(true);
      const data = await fetchApi('/kits');
      const sortedKits = (data.kits || data || []).sort((a: Kit, b: Kit) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
      );
      setKits(sortedKits);
    } catch (err: any) {
      setError(err.message || 'Failed to load kits');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKits();
  }, []);

  const confirmDelete = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDeletingId(id);
  };

  const handleDelete = async () => {
    if (!deletingId) return;
    setIsDeleting(true);
    try {
      await fetchApi(`/kits/${deletingId}`, { method: 'DELETE' });
      setKits(kits.filter(k => k.id !== deletingId));
      addToast('Kit deleted successfully', 'success');
    } catch (err: any) {
      addToast(err.message || 'Failed to delete kit', 'error');
    } finally {
      setIsDeleting(false);
      setDeletingId(null);
    }
  };

  const ReadinessBadge = ({ kit }: { kit: Kit }) => {
    const score = (kit.readiness_score as any)?.overall;
    if (score == null) {
      return (
        <div className="text-xs font-medium px-2 py-1 bg-slate-700/50 text-slate-400 rounded-md">
          Not scored
        </div>
      );
    }
    if (score >= 75) {
      return (
        <div className="text-xs font-medium px-2 py-1 bg-emerald-500/10 text-emerald-400 rounded-md">
          Score: {score}
        </div>
      );
    }
    if (score >= 50) {
      return (
        <div className="text-xs font-medium px-2 py-1 bg-amber-500/10 text-amber-400 rounded-md">
          Score: {score}
        </div>
      );
    }
    return (
      <div className="text-xs font-medium px-2 py-1 bg-red-500/10 text-red-400 rounded-md">
        Score: {score}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Delete confirm modal */}
      {deletingId && (
        <ConfirmModal
          title="Delete this kit?"
          message="This action cannot be undone. All questions, flashcards, and practice session data for this kit will be permanently removed."
          confirmLabel="Delete Kit"
          onConfirm={handleDelete}
          onCancel={() => setDeletingId(null)}
          isLoading={isDeleting}
          isDestructive
        />
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Your Kits</h1>
          <p className="text-slate-400 mt-1">Manage your personalized interview preparation kits.</p>
        </div>

        <Link
          href="/kits/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-lg font-medium transition-all group shrink-0"
        >
          <Plus className="w-5 h-5 group-hover:scale-110 transition-transform" />
          Create New Kit
        </Link>
      </div>

      {error && (
        <div className="p-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-lg">
          {error}
        </div>
      )}

      {/* Empty State */}
      {!isLoading && kits.length === 0 && !error && (
        <div className="flex flex-col items-center justify-center p-12 bg-slate-900/50 backdrop-blur-sm border border-slate-800 border-dashed rounded-2xl">
          <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 flex items-center justify-center mb-4">
            <Calendar className="w-8 h-8 text-indigo-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">No kits yet</h3>
          <p className="text-slate-400 text-center max-w-sm mb-6">
            Create your first interview prep kit by pasting a job description and company URL.
          </p>
          <Link
            href="/kits/new"
            className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Get Started
          </Link>
        </div>
      )}

      {/* Grid of Kits */}
      {!isLoading && kits.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {kits.map((kit) => {
            let hostname = '';
            try { hostname = new URL(kit.company_url).hostname; } catch { hostname = kit.company_url; }
            return (
              <Link
                key={kit.id}
                href={`/kits/${kit.id}`}
                className="group flex flex-col bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 hover:border-indigo-500/50 hover:bg-slate-800/60 transition-all hover:-translate-y-1 hover:shadow-xl hover:shadow-indigo-500/10 cursor-pointer"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-500/20 to-violet-500/20 flex items-center justify-center border border-indigo-500/20">
                    <span className="text-lg font-bold text-indigo-400">
                      {kit.company_brief?.company_name?.charAt(0) || '?'}
                    </span>
                  </div>

                  <button
                    onClick={(e) => confirmDelete(kit.id, e)}
                    className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-400/10 transition-colors opacity-0 group-hover:opacity-100"
                    title="Delete kit"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                <div className="flex-1">
                  <h3 className="text-lg font-bold text-white mb-1 line-clamp-1">
                    {kit.job_title}
                  </h3>
                  <div className="flex items-center gap-2 text-sm text-slate-400 mb-4">
                    <span>{kit.company_brief?.company_name || 'Unknown'}</span>
                    <span>•</span>
                    <span className="flex items-center gap-1 hover:text-indigo-400 transition-colors">
                      <ExternalLink className="w-3 h-3" />
                      <span className="truncate max-w-[100px]">{hostname}</span>
                    </span>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-800 flex items-center justify-between mt-auto">
                  <div className="flex items-center gap-2 text-sm text-slate-400">
                    <Calendar className="w-4 h-4" />
                    {kit.days_available} days prep
                  </div>
                  <ReadinessBadge kit={kit} />
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
