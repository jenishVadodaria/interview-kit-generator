'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Loader2, ArrowRight, Link as LinkIcon, FileText, Zap, CalendarDays, Briefcase, AlertCircle } from 'lucide-react';

export default function NewKitPage() {
  const [jd, setJd] = useState('');
  const [companyUrl, setCompanyUrl] = useState('');
  const [days, setDays] = useState<number | ''>(7);
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

    const parsedDays = typeof days === 'number' ? days : parseInt(days);

    if (!parsedDays || isNaN(parsedDays) || parsedDays < 1 || parsedDays > 60) {
      setError('Days available must be between 1 and 60.');
      return;
    }

    setIsLoading(true);

    try {
      const data = await fetchApi('/kits/generate', {
        method: 'POST',
        body: JSON.stringify({ jd, companyUrl, days: parsedDays }),
      });
      router.push(`/kits/${data.kitId}`);
    } catch (err: any) {
      setError(err.message || 'Failed to start generation');
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 text-indigo-400 mb-2">
          <Briefcase className="w-5 h-5" />
          <span className="font-semibold uppercase tracking-wider text-sm">New Kit</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Create Prep Kit</h1>
        <p className="text-slate-400">Paste a job description to generate a targeted interview prep plan.</p>
      </div>

      <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl">
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-sm flex items-start gap-3 animate-in fade-in">
              <AlertCircle className="w-5 h-5 flex-shrink-0 mt-0.5" />
              <p>{error}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="jd">
              Job Description
            </label>
            <textarea
              id="jd"
              required
              value={jd}
              onChange={(e) => setJd(e.target.value)}
              className="w-full h-48 px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white placeholder-slate-600 resize-none"
              placeholder="Paste the full job description here..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2" htmlFor="companyUrl">
              Company Website (Optional)
            </label>
            <input
              id="companyUrl"
              type="url"
              value={companyUrl}
              onChange={(e) => setCompanyUrl(e.target.value)}
              className="w-full px-4 py-3 bg-slate-950/50 border border-slate-700 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all text-white placeholder-slate-600"
              placeholder="https://example.com"
            />
          </div>

          <div className="flex items-center justify-between p-4 bg-slate-950/30 rounded-xl border border-slate-800/50">
            <label className="flex items-center gap-2 text-sm font-medium text-slate-300" htmlFor="days">
              <CalendarDays className="w-4 h-4 text-indigo-400" />
              Days to Prepare
            </label>
            <div className="flex items-center gap-3">
              <input
                id="days"
                type="number"
                min="1"
                max="60"
                value={days}
                onChange={(e) => setDays(e.target.value === '' ? '' : parseInt(e.target.value) || '')}
                className="w-20 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-center focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all text-white font-medium"
              />
              <span className="text-xs text-slate-500 w-24">1-60 days</span>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed group cursor-pointer"
          >
            {isLoading ? (
              <><Loader2 className="w-5 h-5 animate-spin" /> Generating Kit...</>
            ) : (
              <><Zap className="w-5 h-5 text-indigo-200 group-hover:scale-110 transition-transform" /> Generate Prep Kit</>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
