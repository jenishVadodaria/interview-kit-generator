'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useApi } from '@/hooks/useApi';
import { Layers, Loader2, AlertCircle, CheckCircle2, Upload } from 'lucide-react';
import Papa from 'papaparse';

interface BatchEntry {
  url: string;
  jd: string;
  days: number;
}

export default function BatchProcessingPage() {
  const [entries, setEntries] = useState<BatchEntry[]>([]);
  const [status, setStatus] = useState<'idle' | 'processing' | 'done'>('idle');
  const [results, setResults] = useState<{ url: string; status: 'success' | 'error'; error?: string }[]>([]);
  const { fetchApi } = useApi();
  const router = useRouter();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (result) => {
        const parsed = result.data.map((row: any) => ({
          url: row.company_url || row.url || '',
          jd: row.company_jd || row.jd || '',
          days: parseInt(row.days_to_prepare || row.number_of_days || row.days) || 7,
        })).filter((r) => r.url && r.jd);
        setEntries(parsed);
      }
    });
  };

  const processEntry = async (entry: BatchEntry) => {
    try {
      const { kitId } = await fetchApi('/kits/generate', {
        method: 'POST',
        body: JSON.stringify({ jd: entry.jd, companyUrl: entry.url, days: entry.days }),
      });

      await new Promise<void>((resolve, reject) => {
        const token = localStorage.getItem('auth_token');
        const evtSource = new EventSource(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001'}/kits/${kitId}/progress?token=${token}`);
        
        evtSource.onmessage = (event) => {
          const data = JSON.parse(event.data);
          if (data.step === 'complete') {
            evtSource.close();
            if (data.status === 'success') {
              resolve();
            } else {
              reject(new Error(data.message));
            }
          }
        };
        
        evtSource.onerror = (err) => {
          evtSource.close();
          reject(new Error('EventSource failed.'));
        };
      });

      return { url: entry.url, status: 'success' as const };
    } catch (err: any) {
      return { url: entry.url, status: 'error' as const, error: err.message || 'Generation failed' };
    }
  };

  const handleProcess = async () => {
    if (entries.length === 0) return;
    setStatus('processing');
    setResults([]);

    const newResults: typeof results = [];

    // Process sequentially to avoid blowing up free tier LLM rate limits
    for (const entry of entries) {
      const result = await processEntry(entry);
      newResults.push(result);
      setResults([...newResults]);
    }

    setStatus('done');
  };

  return (
    <div className="max-w-4xl mx-auto py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 text-emerald-400 mb-2">
          <Layers className="w-5 h-5" />
          <span className="font-semibold uppercase tracking-wider text-sm">Bulk Create</span>
        </div>
        <h1 className="text-3xl font-bold text-white mb-2">Batch Process Roles</h1>
        <p className="text-slate-400">Upload a CSV file to generate multiple interview prep kits at once.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 shadow-xl h-fit">
          <div className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload CSV File
              </label>
              <div className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-700 border-dashed rounded-xl bg-slate-950/50 hover:bg-slate-900 transition-colors relative">
                <input 
                  type="file" 
                  accept=".csv" 
                  onChange={handleFileUpload}
                  disabled={status === 'processing'}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
                />
                <Upload className="w-8 h-8 text-slate-500 mb-2" />
                <p className="text-sm text-slate-400">Click or drag a CSV file to upload</p>
              </div>
              <div className="mt-2 space-y-1">
                <p className="text-xs text-slate-500">
                  <strong>Expected Headers:</strong> company_url, company_jd, days_to_prepare
                </p>
                {entries.length > 0 && (
                  <p className="text-xs text-emerald-400 font-medium">
                    ✓ {entries.length} role{entries.length > 1 ? 's' : ''} detected
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={handleProcess}
              disabled={status === 'processing' || entries.length === 0}
              className="w-full flex items-center justify-center gap-2 py-3.5 px-4 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white rounded-xl font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
            >
              {status === 'processing' ? (
                <><Loader2 className="w-5 h-5 animate-spin" /> Processing {entries.length} roles...</>
              ) : (
                <><Layers className="w-5 h-5" /> Process {entries.length || ''} Role{entries.length !== 1 ? 's' : ''}</>
              )}
            </button>
          </div>
        </div>

        {/* Results Panel */}
        <div className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 rounded-2xl overflow-hidden flex flex-col h-[500px]">
          <div className="px-6 py-4 border-b border-slate-800 bg-slate-900/80">
            <h3 className="font-semibold text-white flex items-center justify-between">
              Process Log
              <span className="text-xs font-normal text-slate-400 bg-slate-800 px-2 py-1 rounded">
                {results.length} / {entries.length} processed
              </span>
            </h3>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-950/30">
            {results.length === 0 ? (
              <div className="h-full flex items-center justify-center text-slate-500 text-sm italic">
                {entries.length > 0 ? `Ready to process ${entries.length} role${entries.length > 1 ? 's' : ''}` : 'Upload a CSV to get started'}
              </div>
            ) : (
              results.map((res, i) => (
                <div key={i} className="flex items-start gap-3 p-3 rounded-xl bg-slate-900 border border-slate-800/50">
                  {res.status === 'success' ? (
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0 mt-0.5" />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-slate-300 truncate">{res.url}</p>
                    {res.status === 'error' && (
                      <p className="text-xs text-red-400 mt-1">{res.error}</p>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
          {status === 'done' && (
            <div className="p-4 bg-slate-900 border-t border-slate-800">
              <button
                onClick={() => router.push('/dashboard')}
                className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors cursor-pointer"
              >
                Go to Dashboard
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
