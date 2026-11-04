import React, { useState } from 'react';
import { BookOpen, Copy, Check, Download, ExternalLink, Code2, CheckCircle2, ChevronRight } from 'lucide-react';

interface ReadmeViewerTabProps {
  readmeContent: string;
}

export const ReadmeViewerTab: React.FC<ReadmeViewerTabProps> = ({ readmeContent }) => {
  const [copiedAll, setCopiedAll] = useState(false);

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(readmeContent);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const dataStr = 'data:text/markdown;charset=utf-8,' + encodeURIComponent(readmeContent);
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', 'README.md');
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Header Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <BookOpen className="w-5 h-5 text-purple-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              README.md — Complete Advanced RAG Build Manual
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            This project contains a comprehensive markdown manual at <code className="text-purple-300 bg-purple-950/60 px-1.5 py-0.5 rounded border border-purple-800">/README.md</code> covering mathematical derivations, Python & TypeScript code blueprints, production tech stack recommendations, and benchmark metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCopyMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            {copiedAll ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copiedAll ? 'Copied Full Markdown' : 'Copy Markdown'}</span>
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs shadow-lg shadow-purple-600/20 transition-all"
          >
            <Download className="w-4 h-4" />
            <span>Download README.md</span>
          </button>
        </div>
      </div>

      {/* Rendered Markdown Guide Card */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-6 md:p-8 text-slate-200 font-sans leading-relaxed shadow-lg">
        <div className="prose prose-invert prose-cyan max-w-none text-xs md:text-sm space-y-6">
          {/* Quick Start Checklist */}
          <div className="bg-slate-950/80 border border-slate-800 rounded-xl p-5 space-y-3 not-prose">
            <h3 className="text-sm font-bold text-purple-300 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>Project Implementation Roadmap (Follow-Through Checklist)</span>
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">1</span>
                <span className="text-slate-300">Stage 1: Ingestion & Sliding Window Chunking</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">2</span>
                <span className="text-slate-300">Stage 2: BM25 Sparse Inverted Index</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">3</span>
                <span className="text-slate-300">Stage 3: Dense Vector Embeddings (text-embedding-004)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">4</span>
                <span className="text-slate-300">Stage 4: Dynamic Metadata Pre-Filtering</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">5</span>
                <span className="text-slate-300">Stage 5: Hybrid Search with Reciprocal Rank Fusion</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">6</span>
                <span className="text-slate-300">Stage 6: Cross-Encoder Reranker</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">7</span>
                <span className="text-slate-300">Stage 7: Query Rewriter (HyDE & Multi-Query)</span>
              </div>
              <div className="flex items-center gap-2 p-2 rounded bg-slate-900/60 border border-slate-800">
                <span className="w-5 h-5 rounded-full bg-emerald-950 text-emerald-400 border border-emerald-800 text-[10px] font-bold flex items-center justify-center">8</span>
                <span className="text-slate-300">Stage 8: Grounded Synthesis with Attributions</span>
              </div>
            </div>
          </div>

          {/* Formatted Markdown Output */}
          <div className="bg-slate-950/70 p-6 rounded-xl border border-slate-800/80 font-mono text-xs text-slate-300 whitespace-pre-wrap overflow-x-auto leading-relaxed">
            {readmeContent}
          </div>
        </div>
      </div>
    </div>
  );
};
