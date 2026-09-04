'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Loader2, ArrowRight, Link as LinkIcon, Calendar, FileText } from 'lucide-react';

export default function NewKitPage() {
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState(7);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const { fetchApi } = useApi();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (jd.length < 10) {
      setError('Job description is too short.');
      return;
    }
    if (days < 1 || days > 60) {
      setError('Days available must be between 1 and 60.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await fetchApi('/kits/generate', {
        method: 'POST',
        body: JSON.stringify({ jd, companyUrl, days }),
      });
      
      if (data && data.kitId) {
        // Redirect to progress view
        router.push(`/kits/${data.kitId}/progress`);
      } else {
        throw new Error('No kitId returned from server');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to start generation');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Create a new prep kit</h1>
        <p className="text-slate-400">Paste the job description and we'll build your personalized interview preparation plan.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {error && (
          <div className="p-4 text-sm text-red-400 bg-red-400/10 border border-red-400/20 rounded-xl">
            {error}
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="jd">
              <FileText className="w-4 h-4 text-indigo-400" />
              Job Description
            </label>
            <span className="text-xs text-slate-500">{jd.length} chars</span>
          </div>
          <textarea
            id="jd"
            required
            value={jd}
            onChange={(e) => setJd(e.target.value)}
            className="w-full px-4 py-3 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white placeholder-slate-500 resize-y min-h-[200px]"
            placeholder="Paste the full job description here..."
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="companyUrl">
              <LinkIcon className="w-4 h-4 text-indigo-400" />
              Company URL
            </label>
            <input
              id="companyUrl"
              type="url"
              required
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white placeholder-slate-500"
              placeholder="https://company.com"
            />
            <p className="text-xs text-slate-500">We'll crawl this to find their hiring process.</p>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="days">
              <Calendar className="w-4 h-4 text-indigo-400" />
              Days to Prepare
            </label>
            <input
              id="days"
              type="number"
              min="1"
              max="60"
              required
              value={days}
              onChange={(e) => setDays(parseInt(e.target.value) || 1)}
              className="w-full px-4 py-2.5 bg-slate-900/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white placeholder-slate-500"
            />
             <p className="text-xs text-slate-500">How many days until your interview?</p>
          </div>
        </div>

        <div className="pt-4 flex justify-end">
          <button
            type="submit"
            disabled={isLoading || !jd || !companyUrl}
            className="flex items-center justify-center gap-2 py-3 px-8 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                Generate Kit
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
