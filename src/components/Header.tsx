import React from 'react';
import { 
  Layers, 
  Search, 
  FlaskConical, 
  Workflow, 
  Database, 
  BookOpen, 
  Sparkles, 
  CheckCircle2,
  ChevronDown
} from 'lucide-react';

export type ActiveTab = 'playground' | 'experiments' | 'pipeline' | 'corpus' | 'readme';

interface HeaderProps {
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  corpusKey: string;
  setCorpusKey: (key: string) => void;
  corporaOptions: { key: string; name: string }[];
  chunkCount: number;
  docCount: number;
  isBackendConnected: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  corpusKey,
  setCorpusKey,
  corporaOptions,
  chunkCount,
  docCount,
  isBackendConnected,
}) => {
  return (
    <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-30 px-4 lg:px-8 py-3">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Brand & Stats */}
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-cyan-500/20">
            <Layers className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                Advanced RAG Workbench
                <span className="text-[10px] uppercase font-semibold px-2 py-0.5 rounded-full bg-cyan-950 text-cyan-400 border border-cyan-800">
                  Production Lab
                </span>
              </h1>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span>{docCount} Documents</span>
              <span>•</span>
              <span>{chunkCount} Chunks Indexed</span>
              <span>•</span>
              <span className="flex items-center gap-1 text-emerald-400 font-medium">
                <CheckCircle2 className="w-3 h-3" />
                {isBackendConnected ? 'Gemini 2.5 Active' : 'Local Hybrid Engine'}
              </span>
            </p>
          </div>
        </div>

        {/* Dataset Switcher & Tabs */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Corpus Selector */}
          <div className="relative">
            <select
              value={corpusKey}
              onChange={(e) => setCorpusKey(e.target.value)}
              className="appearance-none bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-200 text-xs font-medium rounded-lg pl-3 pr-8 py-2 focus:outline-none focus:ring-2 focus:ring-cyan-500 cursor-pointer shadow-sm"
            >
              {corporaOptions.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  Corpus: {opt.name}
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>

          {/* Tab Navigation */}
          <nav className="flex items-center gap-1 bg-slate-900/90 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => setActiveTab('playground')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'playground'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Search className="w-3.5 h-3.5" />
              <span>Playground</span>
            </button>

            <button
              onClick={() => setActiveTab('experiments')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'experiments'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <FlaskConical className="w-3.5 h-3.5" />
              <span>Experiments</span>
            </button>

            <button
              onClick={() => setActiveTab('pipeline')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'pipeline'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Workflow className="w-3.5 h-3.5" />
              <span>Pipeline & Specs</span>
            </button>

            <button
              onClick={() => setActiveTab('corpus')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'corpus'
                  ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Database className="w-3.5 h-3.5" />
              <span>Chunks</span>
            </button>

            <button
              onClick={() => setActiveTab('readme')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'readme'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/25'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>README Guide</span>
            </button>
          </nav>
        </div>
      </div>
    </header>
  );
};
