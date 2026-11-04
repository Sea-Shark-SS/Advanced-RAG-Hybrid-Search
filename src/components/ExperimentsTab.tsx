import React, { useState } from 'react';
import { 
  FlaskConical, 
  Play, 
  CheckCircle2, 
  Clock, 
  Award, 
  BarChart3, 
  Layers, 
  Plus, 
  Download, 
  Sparkles,
  ArrowRight,
  TrendingUp,
  HelpCircle,
  Loader2
} from 'lucide-react';
import { BenchmarkMetricResult, BenchmarkQuery, Chunk } from '../types/rag';

interface ExperimentsTabProps {
  benchmarks: BenchmarkQuery[];
  benchmarkResults: BenchmarkMetricResult[];
  isRunningBenchmark: boolean;
  onRunBenchmark: () => Promise<void>;
  onAddBenchmark: (newQuery: BenchmarkQuery) => void;
  availableChunks: Chunk[];
}

export const ExperimentsTab: React.FC<ExperimentsTabProps> = ({
  benchmarks,
  benchmarkResults,
  isRunningBenchmark,
  onRunBenchmark,
  onAddBenchmark,
  availableChunks,
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newQueryText, setNewQueryText] = useState('');
  const [newCategory, setNewCategory] = useState('General');
  const [newDesc, setNewDesc] = useState('');
  const [selectedChunkIds, setSelectedChunkIds] = useState<string[]>([]);
  const [selectedDetailQueryId, setSelectedDetailQueryId] = useState<string | null>(null);

  const handleCreateBenchmark = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQueryText.trim() || selectedChunkIds.length === 0) return;

    const newBench: BenchmarkQuery = {
      id: `custom_bench_${Date.now()}`,
      query: newQueryText.trim(),
      expectedChunkIds: selectedChunkIds,
      category: newCategory.trim() || 'Custom',
      description: newDesc.trim() || 'User defined evaluation query',
    };

    onAddBenchmark(newBench);
    setNewQueryText('');
    setNewDesc('');
    setSelectedChunkIds([]);
    setShowAddModal(false);
  };

  const exportResultsJSON = () => {
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(benchmarkResults, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `rag_retrieval_benchmark_${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Execution Bar */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <FlaskConical className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Retrieval Strategy Experiments & Benchmarks
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl">
            Evaluate retrieval quality across Sparse (BM25), Dense Vector, Hybrid RRF, and Cross-Encoder Reranking using Mean Reciprocal Rank (MRR), Hit Rate@K (Recall), and NDCG@5 against ground-truth technical queries.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-cyan-400" />
            <span>Add Test Query</span>
          </button>

          {benchmarkResults.length > 0 && (
            <button
              onClick={exportResultsJSON}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-slate-200 border border-slate-700 transition-colors"
            >
              <Download className="w-4 h-4 text-slate-400" />
              <span>Export JSON</span>
            </button>
          )}

          <button
            onClick={onRunBenchmark}
            disabled={isRunningBenchmark}
            className="flex items-center gap-2 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs transition-all shadow-lg shadow-cyan-500/25"
          >
            {isRunningBenchmark ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Benchmarking...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-slate-950" />
                <span>Run Full Benchmark Suite</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Metrics Summary Comparison Cards */}
      {benchmarkResults.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {benchmarkResults.map((strat) => {
            const isAdvanced = strat.strategy === 'hybrid_reranked';
            return (
              <div
                key={strat.strategy}
                className={`p-5 rounded-2xl border transition-all ${
                  isAdvanced
                    ? 'bg-gradient-to-b from-slate-900 to-cyan-950/20 border-cyan-500/60 shadow-xl shadow-cyan-950/20 ring-1 ring-cyan-500/30'
                    : 'bg-slate-900/80 border-slate-800'
                }`}
              >
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                    {strat.label}
                  </h3>
                  {isAdvanced && (
                    <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-cyan-900 text-cyan-300 border border-cyan-700">
                      Top Performer
                    </span>
                  )}
                </div>

                <div className="space-y-3">
                  {/* MRR */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <span>MRR</span>
                      <span className="text-[10px] text-slate-500">(Mean Reciprocal)</span>
                    </span>
                    <span className="font-mono text-base font-bold text-cyan-400">
                      {strat.mrr}
                    </span>
                  </div>

                  {/* Hit Rate @ 5 (Recall) */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Hit Rate @ 5 (Recall)</span>
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {(strat.hitRateAt5 * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* NDCG @ 5 */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">NDCG @ 5</span>
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {strat.ndcgAt5}
                    </span>
                  </div>

                  {/* Hit Rate @ 1 */}
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="text-xs text-slate-400">Top-1 Accuracy</span>
                    <span className="font-mono text-sm font-semibold text-slate-200">
                      {(strat.hitRateAt1 * 100).toFixed(0)}%
                    </span>
                  </div>

                  {/* Latency */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-500" />
                      <span>Avg Latency</span>
                    </span>
                    <span className="font-mono text-xs text-slate-400">
                      {strat.avgLatencyMs} ms
                    </span>
                  </div>
                </div>

                {/* Progress Visualizer */}
                <div className="mt-4 pt-3 border-t border-slate-800/80">
                  <div className="text-[10px] text-slate-500 mb-1 flex justify-between">
                    <span>Retrieval Quality Index</span>
                    <span>{Math.round(strat.mrr * 100)} / 100</span>
                  </div>
                  <div className="w-full bg-slate-950 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        isAdvanced
                          ? 'bg-gradient-to-r from-cyan-400 to-emerald-400'
                          : 'bg-indigo-500'
                      }`}
                      style={{ width: `${Math.max(5, strat.mrr * 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-slate-900/60 border border-slate-800 border-dashed rounded-2xl p-12 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-800 text-cyan-400 flex items-center justify-center mx-auto">
            <FlaskConical className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white mb-1">
              Ready to Run Retrieval Experiments
            </h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Click "Run Full Benchmark Suite" to execute all 4 retrieval strategies across {benchmarks.length} test queries and visualize comparative MRR, Recall@K, and Latency metrics.
            </p>
          </div>
          <button
            onClick={onRunBenchmark}
            className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold px-5 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20"
          >
            <Play className="w-4 h-4 fill-slate-950" />
            <span>Start Benchmark Now</span>
          </button>
        </div>
      )}

      {/* Query-by-Query Detailed Matrix */}
      {benchmarkResults.length > 0 && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-white">
                Query-Level Performance Breakdown
              </h3>
              <p className="text-xs text-slate-400">
                Inspect which strategy placed the target passage at Rank #1 for each evaluation prompt.
              </p>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {benchmarks.length} Test Queries Evaluated
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-semibold bg-slate-950/50">
                  <th className="py-3 px-4">Evaluation Query</th>
                  <th className="py-3 px-3">BM25 Rank</th>
                  <th className="py-3 px-3">Dense Vector</th>
                  <th className="py-3 px-3">Hybrid (RRF)</th>
                  <th className="py-3 px-3">Hybrid + Rerank</th>
                  <th className="py-3 px-3 text-right">Target Ground Truth</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {benchmarks.map((b) => {
                  const getRank = (stratKey: string) => {
                    const strat = benchmarkResults.find((s) => s.strategy === stratKey);
                    const qRes = strat?.queryResults.find((q) => q.queryId === b.id);
                    return qRes?.firstHitRank ?? null;
                  };

                  const bm25Rank = getRank('sparse_bm25');
                  const denseRank = getRank('dense_vector');
                  const rrfRank = getRank('hybrid_rrf');
                  const rerankRank = getRank('hybrid_reranked');

                  return (
                    <tr key={b.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 max-w-sm">
                        <p className="font-semibold text-slate-200">{b.query}</p>
                        <p className="text-[11px] text-slate-500 truncate">{b.description}</p>
                      </td>

                      {/* BM25 */}
                      <td className="py-3 px-3 font-mono">
                        {bm25Rank ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              bm25Rank === 1
                                ? 'bg-amber-950 text-amber-300 border border-amber-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{bm25Rank}
                          </span>
                        ) : (
                          <span className="text-slate-600">Miss (&gt;5)</span>
                        )}
                      </td>

                      {/* Dense */}
                      <td className="py-3 px-3 font-mono">
                        {denseRank ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              denseRank === 1
                                ? 'bg-blue-950 text-blue-300 border border-blue-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{denseRank}
                          </span>
                        ) : (
                          <span className="text-slate-600">Miss (&gt;5)</span>
                        )}
                      </td>

                      {/* Hybrid RRF */}
                      <td className="py-3 px-3 font-mono">
                        {rrfRank ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              rrfRank === 1
                                ? 'bg-purple-950 text-purple-300 border border-purple-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{rrfRank}
                          </span>
                        ) : (
                          <span className="text-slate-600">Miss (&gt;5)</span>
                        )}
                      </td>

                      {/* Hybrid + Reranker */}
                      <td className="py-3 px-3 font-mono">
                        {rerankRank ? (
                          <span
                            className={`px-2 py-0.5 rounded font-bold ${
                              rerankRank === 1
                                ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                                : 'bg-slate-800 text-slate-300'
                            }`}
                          >
                            #{rerankRank}
                          </span>
                        ) : (
                          <span className="text-slate-600">Miss (&gt;5)</span>
                        )}
                      </td>

                      <td className="py-3 px-3 text-right text-[11px] font-mono text-slate-400">
                        {b.expectedChunkIds.join(', ')}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Custom Benchmark Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Add Ground-Truth Evaluation Query</span>
              </h3>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateBenchmark} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Query String
                </label>
                <input
                  type="text"
                  required
                  value={newQueryText}
                  onChange={(e) => setNewQueryText(e.target.value)}
                  placeholder="e.g. How does Raft handle split brain conditions?"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Consensus, Rerank"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    Description
                  </label>
                  <input
                    type="text"
                    value={newDesc}
                    onChange={(e) => setNewDesc(e.target.value)}
                    placeholder="Short benchmark intent"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  Target Relevant Chunks (Select at least 1)
                </label>
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-slate-800 rounded-lg p-2 bg-slate-950">
                  {availableChunks.map((chunk) => {
                    const isSelected = selectedChunkIds.includes(chunk.id);
                    return (
                      <div
                        key={chunk.id}
                        onClick={() => {
                          setSelectedChunkIds((prev) =>
                            isSelected ? prev.filter((id) => id !== chunk.id) : [...prev, chunk.id]
                          );
                        }}
                        className={`p-2 rounded text-xs cursor-pointer border transition-all flex items-start gap-2 ${
                          isSelected
                            ? 'bg-cyan-950/60 border-cyan-500 text-cyan-200'
                            : 'bg-slate-900 border-slate-800 text-slate-300 hover:border-slate-700'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => {}}
                          className="mt-0.5 rounded text-cyan-500"
                        />
                        <div className="flex-1 min-w-0">
                          <p className="font-semibold truncate">
                            {chunk.metadata.title} ({chunk.id})
                          </p>
                          <p className="text-[11px] text-slate-400 line-clamp-1">{chunk.text}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newQueryText.trim() || selectedChunkIds.length === 0}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-lg text-xs"
                >
                  Save Test Query
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
