import React, { useState } from 'react';
import { 
  Search, 
  Sparkles, 
  Filter, 
  ArrowUpDown, 
  Check, 
  BookOpen, 
  SlidersHorizontal, 
  Zap, 
  FileText, 
  ChevronRight,
  TrendingUp,
  Tag,
  Calendar,
  User,
  Quote,
  Loader2,
  Copy,
  Info
} from 'lucide-react';
import { Chunk, SearchResult, QueryRewriteMode, MetadataFilter } from '../types/rag';
import { BM25SearchResult } from '../utils/bm25';
import { DenseSearchResult } from '../utils/vectorEngine';
import { RerankedResult } from '../utils/reranker';
import { RewriteResult } from '../utils/queryRewriter';

interface PlaygroundTabProps {
  query: string;
  setQuery: (q: string) => void;
  onSearch: (q?: string) => Promise<void>;
  isLoading: boolean;
  rewriteMode: QueryRewriteMode;
  setRewriteMode: (m: QueryRewriteMode) => void;
  rewriteResult: RewriteResult | null;
  bm25Results: BM25SearchResult[];
  denseResults: DenseSearchResult[];
  hybridResults: SearchResult[];
  rerankedResults: RerankedResult[];
  metadataFilter: MetadataFilter;
  setMetadataFilter: React.Dispatch<React.SetStateAction<MetadataFilter>>;
  availableCategories: string[];
  availableTags: string[];
  sampleQueries: string[];
  answer: string | null;
  isGeneratingAnswer: boolean;
  onGenerateAnswer: () => Promise<void>;
}

export const PlaygroundTab: React.FC<PlaygroundTabProps> = ({
  query,
  setQuery,
  onSearch,
  isLoading,
  rewriteMode,
  setRewriteMode,
  rewriteResult,
  bm25Results,
  denseResults,
  hybridResults,
  rerankedResults,
  metadataFilter,
  setMetadataFilter,
  availableCategories,
  availableTags,
  sampleQueries,
  answer,
  isGeneratingAnswer,
  onGenerateAnswer,
}) => {
  const [viewMode, setViewMode] = useState<'advanced' | 'comparison'>('advanced');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedChunkId, setSelectedChunkId] = useState<string | null>(null);
  const [copiedAnswer, setCopiedAnswer] = useState(false);

  const activeFilterCount = (metadataFilter.category ? 1 : 0) +
    (metadataFilter.selectedTags && metadataFilter.selectedTags.length > 0 ? 1 : 0) +
    (metadataFilter.minYear ? 1 : 0);

  const handleCopyAnswer = () => {
    if (!answer) return;
    navigator.clipboard.writeText(answer);
    setCopiedAnswer(true);
    setTimeout(() => setCopiedAnswer(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Search Bar & Primary Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-xl">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onSearch();
          }}
          className="space-y-4"
        >
          <div className="relative flex items-center">
            <div className="absolute left-4 text-cyan-400">
              <Search className="w-5 h-5" />
            </div>
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Ask a technical question to run hybrid search, reranking & retrieval..."
              className="w-full bg-slate-950 border border-slate-700 focus:border-cyan-500 rounded-xl pl-12 pr-32 py-3.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-cyan-500/20 transition-all"
            />
            <div className="absolute right-2 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-semibold border transition-all ${
                  activeFilterCount > 0
                    ? 'bg-cyan-950/80 border-cyan-700 text-cyan-300'
                    : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-700'
                }`}
              >
                <Filter className="w-3.5 h-3.5" />
                <span>Filters</span>
                {activeFilterCount > 0 && (
                  <span className="w-4 h-4 rounded-full bg-cyan-500 text-slate-950 text-[10px] font-bold flex items-center justify-center">
                    {activeFilterCount}
                  </span>
                )}
              </button>

              <button
                type="submit"
                disabled={isLoading || !query.trim()}
                className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-md shadow-cyan-500/20"
              >
                {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                <span>Retrieve</span>
              </button>
            </div>
          </div>

          {/* Sample Query Suggestions */}
          <div className="flex flex-wrap items-center gap-2 pt-1 text-xs text-slate-400">
            <span className="font-semibold text-slate-500 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-cyan-400" /> Suggestions:
            </span>
            {sampleQueries.map((sq, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setQuery(sq);
                  onSearch(sq);
                }}
                className="bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-cyan-300 px-2.5 py-1 rounded-md text-xs transition-colors truncate max-w-xs text-left"
              >
                {sq}
              </button>
            ))}
          </div>

          {/* Query Rewriting Mode Selector */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800/80">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Query Transformation:
              </span>
              {(['direct', 'hyde', 'multi_query', 'step_back', 'sub_questions'] as QueryRewriteMode[]).map((mode) => (
                <button
                  key={mode}
                  type="button"
                  onClick={() => setRewriteMode(mode)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-all ${
                    rewriteMode === mode
                      ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-500/30 font-semibold'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200 hover:bg-slate-700'
                  }`}
                >
                  {mode === 'direct' && 'Direct (Raw)'}
                  {mode === 'hyde' && '⚡ HyDE (Hypothetical Doc)'}
                  {mode === 'multi_query' && 'Multi-Query Expansion'}
                  {mode === 'step_back' && 'Step-Back Prompting'}
                  {mode === 'sub_questions' && 'Sub-Questions'}
                </button>
              ))}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setViewMode('advanced')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'advanced'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Pipeline View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('comparison')}
                className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${
                  viewMode === 'comparison'
                    ? 'bg-slate-800 text-cyan-400 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                4-Way Matrix
              </button>
            </div>
          </div>
        </form>

        {/* Metadata Filter Panel */}
        {showFilters && (
          <div className="mt-4 pt-4 border-t border-slate-800 grid grid-cols-1 md:grid-cols-3 gap-4 bg-slate-950/60 p-4 rounded-xl border border-slate-800/80">
            {/* Category Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Category Pre-Filter
              </label>
              <select
                value={metadataFilter.category || ''}
                onChange={(e) =>
                  setMetadataFilter((prev) => ({
                    ...prev,
                    category: e.target.value || undefined,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">All Categories</option>
                {availableCategories.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Min Year Filter */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Publication Year (Min)
              </label>
              <select
                value={metadataFilter.minYear || ''}
                onChange={(e) =>
                  setMetadataFilter((prev) => ({
                    ...prev,
                    minYear: e.target.value ? Number(e.target.value) : undefined,
                  }))
                }
                className="w-full bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-2 text-slate-200 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              >
                <option value="">Any Year</option>
                <option value="2024">2024 (Latest Only)</option>
                <option value="2023">2023 or Later</option>
              </select>
            </div>

            {/* Tag Selection */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Topic Tags (Any)
              </label>
              <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                {availableTags.map((tag) => {
                  const isSelected = metadataFilter.selectedTags?.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => {
                        setMetadataFilter((prev) => {
                          const current = prev.selectedTags || [];
                          return {
                            ...prev,
                            selectedTags: isSelected
                              ? current.filter((t) => t !== tag)
                              : [...current, tag],
                          };
                        });
                      }}
                      className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                        isSelected
                          ? 'bg-cyan-500 text-slate-950 border-cyan-400 font-semibold'
                          : 'bg-slate-900 text-slate-400 border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      #{tag}
                    </button>
                  );
                })}
              </div>
            </div>

            {activeFilterCount > 0 && (
              <div className="col-span-full flex justify-end">
                <button
                  type="button"
                  onClick={() => setMetadataFilter({})}
                  className="text-xs text-rose-400 hover:text-rose-300 font-medium"
                >
                  Reset all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Query Rewriter Inspector Card (when active) */}
      {rewriteResult && rewriteResult.mode !== 'direct' && (
        <div className="bg-indigo-950/30 border border-indigo-900/60 rounded-xl p-4 flex flex-col md:flex-row items-start justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-900 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                {rewriteResult.mode.replace('_', ' ')} Transformation
              </span>
              <span className="text-xs text-indigo-400">
                {rewriteResult.isAiGenerated ? 'Gemini 2.5 LLM' : 'Engine Heuristics'}
              </span>
            </div>
            <p className="text-xs text-slate-300">{rewriteResult.explanation}</p>
            {rewriteResult.hypotheticalDoc && (
              <div className="bg-slate-950/80 border border-indigo-950 p-3 rounded-lg text-xs text-slate-300 italic font-serif">
                <span className="font-sans font-semibold text-indigo-400 not-italic block mb-1">
                  Synthesized Hypothetical Passage (HyDE):
                </span>
                "{rewriteResult.hypotheticalDoc}"
              </div>
            )}
            {rewriteResult.rewrittenQueries.length > 1 && (
              <div className="space-y-1">
                <span className="text-xs font-semibold text-indigo-400">Parallel Search Perspectives:</span>
                <ul className="list-disc list-inside text-xs text-slate-300 space-y-0.5">
                  {rewriteResult.rewrittenQueries.map((rq, idx) => (
                    <li key={idx} className="font-mono text-[11px] text-cyan-300">
                      {rq}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Grounded Synthesis Section */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-cyan-400" />
            <h2 className="text-sm font-bold text-white tracking-wide">
              Grounded Answer Synthesis
            </h2>
            <span className="text-xs text-slate-400">
              (Conditioned strictly on top reranked passages)
            </span>
          </div>

          <div className="flex items-center gap-2">
            {answer && (
              <button
                onClick={handleCopyAnswer}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-medium text-slate-300 transition-colors"
              >
                {copiedAnswer ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAnswer ? 'Copied' : 'Copy'}</span>
              </button>
            )}

            <button
              onClick={onGenerateAnswer}
              disabled={isGeneratingAnswer || rerankedResults.length === 0}
              className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold px-4 py-1.5 rounded-lg text-xs transition-all shadow-md shadow-cyan-500/20"
            >
              {isGeneratingAnswer ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Synthesizing...</span>
                </>
              ) : (
                <>
                  <Quote className="w-3.5 h-3.5" />
                  <span>{answer ? 'Regenerate Answer' : 'Synthesize Answer'}</span>
                </>
              )}
            </button>
          </div>
        </div>

        {answer ? (
          <div className="bg-slate-950/80 border border-slate-800/80 rounded-xl p-4 text-sm text-slate-200 leading-relaxed space-y-3">
            <div className="whitespace-pre-line prose prose-invert prose-cyan max-w-none text-xs md:text-sm">
              {answer}
            </div>

            {/* Clickable Citations */}
            <div className="pt-3 border-t border-slate-800/60 flex flex-wrap items-center gap-2">
              <span className="text-xs font-semibold text-slate-400">Retrieved Evidence Sources:</span>
              {rerankedResults.slice(0, 3).map((r, i) => (
                <button
                  key={r.chunk.id}
                  onClick={() => setSelectedChunkId(r.chunk.id)}
                  className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1.5 transition-all ${
                    selectedChunkId === r.chunk.id
                      ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                      : 'bg-slate-900 text-cyan-300 border-cyan-900/60 hover:bg-slate-800'
                  }`}
                >
                  <span>[Source {i + 1}]</span>
                  <span className="text-slate-400 font-normal truncate max-w-[140px]">
                    {r.chunk.metadata.title}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-xs text-slate-500 italic py-2">
            Click "Synthesize Answer" to generate an answer with inline source citations based on the top reranked chunks.
          </div>
        )}
      </div>

      {/* Main Retrieval Results: 4-Way Comparison or Pipeline View */}
      {viewMode === 'comparison' ? (
        /* 4-Way Side-by-Side Comparison */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* 1. BM25 Sparse */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                  1. Sparse (BM25)
                </h3>
                <p className="text-[11px] text-slate-400">Lexical term saturation</p>
              </div>
              <span className="text-xs font-mono text-amber-400/80 bg-amber-950/60 px-2 py-0.5 rounded">
                k₁=1.5, b=0.75
              </span>
            </div>
            <div className="space-y-2.5">
              {bm25Results.slice(0, 4).map((res, idx) => (
                <div
                  key={res.chunk.id}
                  onClick={() => setSelectedChunkId(res.chunk.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedChunkId === res.chunk.id
                      ? 'bg-amber-950/30 border-amber-500/80'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-amber-400">Rank #{idx + 1}</span>
                    <span className="font-mono text-[11px] text-slate-400">Score: {res.score}</span>
                  </div>
                  <h4 className="font-semibold text-slate-200 truncate">{res.chunk.metadata.title}</h4>
                  <p className="text-slate-400 line-clamp-2 mt-1">{res.chunk.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 2. Dense Vector */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
                  2. Dense Vector
                </h3>
                <p className="text-[11px] text-slate-400">Cosine semantic similarity</p>
              </div>
              <span className="text-xs font-mono text-blue-400/80 bg-blue-950/60 px-2 py-0.5 rounded">
                Cosine [-1..1]
              </span>
            </div>
            <div className="space-y-2.5">
              {denseResults.slice(0, 4).map((res, idx) => (
                <div
                  key={res.chunk.id}
                  onClick={() => setSelectedChunkId(res.chunk.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedChunkId === res.chunk.id
                      ? 'bg-blue-950/30 border-blue-500/80'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-blue-400">Rank #{idx + 1}</span>
                    <span className="font-mono text-[11px] text-slate-400">Sim: {res.score}</span>
                  </div>
                  <h4 className="font-semibold text-slate-200 truncate">{res.chunk.metadata.title}</h4>
                  <p className="text-slate-400 line-clamp-2 mt-1">{res.chunk.text}</p>
                </div>
              ))}
            </div>
          </div>

          {/* 3. Hybrid RRF */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <div>
                <h3 className="text-xs font-bold text-purple-400 uppercase tracking-wider">
                  3. Hybrid (RRF)
                </h3>
                <p className="text-[11px] text-slate-400">Reciprocal Rank Fusion</p>
              </div>
              <span className="text-xs font-mono text-purple-400/80 bg-purple-950/60 px-2 py-0.5 rounded">
                k=60
              </span>
            </div>
            <div className="space-y-2.5">
              {hybridResults.slice(0, 4).map((res, idx) => (
                <div
                  key={res.chunk.id}
                  onClick={() => setSelectedChunkId(res.chunk.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedChunkId === res.chunk.id
                      ? 'bg-purple-950/30 border-purple-500/80'
                      : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-purple-400">Rank #{idx + 1}</span>
                    <span className="font-mono text-[11px] text-slate-400">RRF: {res.rrfScore}</span>
                  </div>
                  <h4 className="font-semibold text-slate-200 truncate">{res.chunk.metadata.title}</h4>
                  <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-1">
                    <span>Sparse #{res.bm25Rank ?? '—'}</span>
                    <span>•</span>
                    <span>Dense #{res.denseRank ?? '—'}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* 4. Cross-Encoder Reranked */}
          <div className="bg-slate-900/90 border border-cyan-800/80 rounded-xl p-4 space-y-3 shadow-lg shadow-cyan-950/20">
            <div className="flex items-center justify-between border-b border-cyan-800/60 pb-2">
              <div>
                <h3 className="text-xs font-bold text-cyan-300 uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" /> 4. Reranked
                </h3>
                <p className="text-[11px] text-slate-400">Cross-encoder attention</p>
              </div>
              <span className="text-xs font-bold text-cyan-400 bg-cyan-950 px-2 py-0.5 rounded border border-cyan-800">
                Final Top-K
              </span>
            </div>
            <div className="space-y-2.5">
              {rerankedResults.slice(0, 4).map((res, idx) => (
                <div
                  key={res.chunk.id}
                  onClick={() => setSelectedChunkId(res.chunk.id)}
                  className={`p-3 rounded-lg border text-xs cursor-pointer transition-all ${
                    selectedChunkId === res.chunk.id
                      ? 'bg-cyan-950/40 border-cyan-400'
                      : 'bg-slate-950/80 border-slate-800 hover:border-cyan-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-1.5">
                      <span className="font-bold text-cyan-300">Rank #{idx + 1}</span>
                      {res.rankDelta !== 0 && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            res.rankDelta > 0
                              ? 'bg-emerald-950 text-emerald-400 border border-emerald-800'
                              : 'bg-rose-950 text-rose-400 border border-rose-800'
                          }`}
                        >
                          {res.rankDelta > 0 ? `▲ +${res.rankDelta}` : `▼ ${res.rankDelta}`}
                        </span>
                      )}
                    </div>
                    <span className="font-mono text-[11px] font-bold text-cyan-400">
                      {res.rerankScore}
                    </span>
                  </div>
                  <h4 className="font-semibold text-slate-200 truncate">{res.chunk.metadata.title}</h4>
                  <p className="text-slate-400 line-clamp-2 mt-1">{res.chunk.text}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Full Pipeline Deep View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Top Retrieved Passages After Cross-Encoder Reranking</span>
              <span className="text-xs font-normal text-slate-400">
                ({rerankedResults.length} passages scored)
              </span>
            </h3>
            <span className="text-xs text-slate-400">
              Sorted by Cross-Encoder Relevancy Probability
            </span>
          </div>

          <div className="space-y-3">
            {rerankedResults.map((result, idx) => {
              const isSelected = selectedChunkId === result.chunk.id;
              return (
                <div
                  key={result.chunk.id}
                  onClick={() => setSelectedChunkId(result.chunk.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer ${
                    isSelected
                      ? 'bg-slate-900 border-cyan-500 shadow-lg shadow-cyan-950/30 ring-1 ring-cyan-500/30'
                      : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-2">
                      <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-cyan-950 text-cyan-300 border border-cyan-800 font-bold text-xs">
                        #{idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">
                          {result.chunk.metadata.title}
                        </h4>
                        <div className="flex items-center gap-2 text-xs text-slate-400">
                          <span>Chunk ID: {result.chunk.id}</span>
                          <span>•</span>
                          <span>{result.chunk.metadata.category}</span>
                          <span>•</span>
                          <span>{result.chunk.metadata.year}</span>
                        </div>
                      </div>
                    </div>

                    {/* Score badges */}
                    <div className="flex items-center gap-2">
                      {/* Rank Movement */}
                      {result.rankDelta !== 0 && (
                        <div
                          className={`flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-md border ${
                            result.rankDelta > 0
                              ? 'bg-emerald-950/60 border-emerald-800 text-emerald-400'
                              : 'bg-rose-950/60 border-rose-800 text-rose-400'
                          }`}
                        >
                          <TrendingUp className="w-3 h-3" />
                          <span>
                            {result.rankDelta > 0
                              ? `Climbed +${result.rankDelta} ranks`
                              : `Dropped ${result.rankDelta} ranks`}
                          </span>
                        </div>
                      )}

                      <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono">
                        <span className="text-slate-400">Cross-Encoder: </span>
                        <span className="font-bold text-cyan-300">{result.rerankScore}</span>
                      </div>

                      {result.rrfScore && (
                        <div className="bg-slate-950 border border-slate-800 px-2.5 py-1 rounded-lg text-xs font-mono">
                          <span className="text-slate-400">RRF: </span>
                          <span className="text-purple-300">{result.rrfScore}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Passage Text */}
                  <div className="bg-slate-950/60 p-3.5 rounded-lg border border-slate-800/80 text-xs md:text-sm text-slate-300 leading-relaxed font-sans">
                    {result.chunk.text}
                  </div>

                  {/* Relevancy Reasoning & Metadata Tags */}
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs">
                    {result.rerankReasoning && (
                      <p className="text-slate-400 flex items-center gap-1.5 italic">
                        <Info className="w-3.5 h-3.5 text-cyan-400 shrink-0 not-italic" />
                        <span>{result.rerankReasoning}</span>
                      </p>
                    )}

                    <div className="flex flex-wrap items-center gap-1.5">
                      {result.chunk.metadata.tags.map((t) => (
                        <span
                          key={t}
                          className="bg-slate-800/80 border border-slate-700/60 text-slate-300 text-[10px] px-2 py-0.5 rounded-full"
                        >
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
