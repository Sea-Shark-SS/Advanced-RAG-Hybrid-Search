/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Header, ActiveTab } from './components/Header';
import { PlaygroundTab } from './components/PlaygroundTab';
import { ExperimentsTab } from './components/ExperimentsTab';
import { PipelineFlowTab } from './components/PipelineFlowTab';
import { CorpusTab } from './components/CorpusTab';
import { ReadmeViewerTab } from './components/ReadmeViewerTab';
import { DEFAULT_CORPORA } from './data/defaultCorpus';
import { chunkDocuments } from './utils/chunker';
import { BM25Engine, BM25SearchResult } from './utils/bm25';
import { DenseVectorEngine, DenseSearchResult } from './utils/vectorEngine';
import { reciprocalRankFusion } from './utils/hybridFusion';
import { rerankCandidates, RerankedResult } from './utils/reranker';
import { rewriteQuery, RewriteResult } from './utils/queryRewriter';
import { runBenchmarkSuite } from './utils/evaluator';
import { 
  DocumentItem, 
  Chunk, 
  SearchResult, 
  QueryRewriteMode, 
  MetadataFilter, 
  PipelineSettings, 
  BenchmarkQuery, 
  BenchmarkMetricResult 
} from './types/rag';
import readmeRaw from '../README.md?raw';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('playground');
  const [corpusKey, setCorpusKey] = useState<string>('rag_systems');
  const [isBackendConnected, setIsBackendConnected] = useState<boolean>(false);

  // Settings
  const [settings, setSettings] = useState<PipelineSettings>({
    chunkSize: 300,
    chunkOverlap: 40,
    bm25_k1: 1.5,
    bm25_b: 0.75,
    rrf_k: 60,
    denseWeight: 0.5,
    rerankerTopK: 5,
    rewriteMode: 'direct',
    topK: 10,
  });

  // Current documents & custom docs
  const [customDocuments, setCustomDocuments] = useState<DocumentItem[]>([]);
  const currentCorpusData = DEFAULT_CORPORA[corpusKey] || DEFAULT_CORPORA['rag_systems'];
  
  const documents = useMemo(() => {
    return [...currentCorpusData.documents, ...customDocuments];
  }, [currentCorpusData, customDocuments]);

  // Dynamic chunking
  const chunks = useMemo(() => {
    return chunkDocuments(documents, settings.chunkSize, settings.chunkOverlap);
  }, [documents, settings.chunkSize, settings.chunkOverlap]);

  // Engines
  const bm25Engine = useMemo(() => {
    const engine = new BM25Engine(settings.bm25_k1, settings.bm25_b);
    engine.index(chunks);
    return engine;
  }, [chunks, settings.bm25_k1, settings.bm25_b]);

  const denseEngine = useMemo(() => {
    const engine = new DenseVectorEngine();
    engine.index(chunks);
    return engine;
  }, [chunks]);

  // Playground state
  const [query, setQuery] = useState<string>(
    'How does Reciprocal Rank Fusion solve score calibration between BM25 and vector search?'
  );
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [rewriteMode, setRewriteMode] = useState<QueryRewriteMode>('direct');
  const [rewriteResult, setRewriteResult] = useState<RewriteResult | null>(null);
  const [metadataFilter, setMetadataFilter] = useState<MetadataFilter>({});

  const [bm25Results, setBm25Results] = useState<BM25SearchResult[]>([]);
  const [denseResults, setDenseResults] = useState<DenseSearchResult[]>([]);
  const [hybridResults, setHybridResults] = useState<SearchResult[]>([]);
  const [rerankedResults, setRerankedResults] = useState<RerankedResult[]>([]);

  // Grounded answer synthesis state
  const [answer, setAnswer] = useState<string | null>(null);
  const [isGeneratingAnswer, setIsGeneratingAnswer] = useState<boolean>(false);

  // Benchmarks state
  const [benchmarks, setBenchmarks] = useState<BenchmarkQuery[]>(currentCorpusData.benchmarks);
  const [benchmarkResults, setBenchmarkResults] = useState<BenchmarkMetricResult[]>([]);
  const [isRunningBenchmark, setIsRunningBenchmark] = useState<boolean>(false);

  // Check backend status on mount
  useEffect(() => {
    fetch('/api/rag/status')
      .then((res) => res.json())
      .then((data) => {
        setIsBackendConnected(Boolean(data && data.status === 'online'));
      })
      .catch(() => {
        setIsBackendConnected(false);
      });
  }, []);

  // Update benchmarks when corpus changes
  useEffect(() => {
    setBenchmarks(currentCorpusData.benchmarks);
    setBenchmarkResults([]);
    setAnswer(null);
  }, [corpusKey, currentCorpusData]);

  // Available metadata options
  const availableCategories = useMemo(() => {
    return Array.from(new Set(documents.map((d) => d.category)));
  }, [documents]);

  const availableTags = useMemo(() => {
    const tags = new Set<string>();
    documents.forEach((d) => d.tags.forEach((t) => tags.add(t)));
    return Array.from(tags);
  }, [documents]);

  const sampleQueries = useMemo(() => {
    return currentCorpusData.benchmarks.map((b) => b.query);
  }, [currentCorpusData]);

  // Filtering helper
  const filterPassages = useCallback(
    (chunkList: Chunk[]): Set<string> => {
      const validIds = new Set<string>();
      chunkList.forEach((c) => {
        if (metadataFilter.category && c.metadata.category !== metadataFilter.category) {
          return;
        }
        if (metadataFilter.minYear && c.metadata.year < metadataFilter.minYear) {
          return;
        }
        if (metadataFilter.selectedTags && metadataFilter.selectedTags.length > 0) {
          const hasTag = metadataFilter.selectedTags.some((tag) => c.metadata.tags.includes(tag));
          if (!hasTag) return;
        }
        validIds.add(c.id);
      });
      return validIds;
    },
    [metadataFilter]
  );

  // Execute Search
  const executeSearch = useCallback(
    async (overrideQuery?: string) => {
      const q = overrideQuery || query;
      if (!q.trim() || chunks.length === 0) return;

      setIsLoading(true);
      setAnswer(null);

      try {
        // Step 1: Query Transformation (HyDE, Multi-Query, Step-Back)
        const rewritten = await rewriteQuery(q, rewriteMode);
        setRewriteResult(rewritten);

        // Target search query for BM25 and Dense
        const queriesToSearch = rewritten.rewrittenQueries;
        const denseSearchTarget = rewritten.hypotheticalDoc || q;

        // Step 2: Metadata Pre-filter candidate IDs
        const validChunkIds = filterPassages(chunks);

        // Step 3: Sparse BM25 Search
        let allBm25: BM25SearchResult[] = [];
        for (const subQ of queriesToSearch) {
          const res = bm25Engine.search(subQ, 20);
          allBm25.push(...res);
        }
        // Deduplicate & filter
        const bm25Map = new Map<string, BM25SearchResult>();
        allBm25.forEach((item) => {
          if (!validChunkIds.has(item.chunk.id)) return;
          if (!bm25Map.has(item.chunk.id) || bm25Map.get(item.chunk.id)!.score < item.score) {
            bm25Map.set(item.chunk.id, item);
          }
        });
        const finalBm25 = Array.from(bm25Map.values()).sort((a, b) => b.score - a.score);
        setBm25Results(finalBm25);

        // Step 4: Dense Vector Search
        const rawDense = await denseEngine.search(denseSearchTarget, 20);
        const finalDense = rawDense.filter((item) => validChunkIds.has(item.chunk.id));
        setDenseResults(finalDense);

        // Step 5: Hybrid Fusion (Reciprocal Rank Fusion)
        const fused = reciprocalRankFusion(finalBm25, finalDense, settings.rrf_k, 15);
        setHybridResults(fused);

        // Step 6: Cross-Encoder Reranker
        const reranked = await rerankCandidates(q, fused, settings.rerankerTopK);
        setRerankedResults(reranked);
      } catch (err) {
        console.error('Search pipeline execution error:', err);
      } finally {
        setIsLoading(false);
      }
    },
    [
      query,
      chunks,
      rewriteMode,
      filterPassages,
      bm25Engine,
      denseEngine,
      settings.rrf_k,
      settings.rerankerTopK,
    ]
  );

  // Run search on initial load
  useEffect(() => {
    if (chunks.length > 0) {
      executeSearch();
    }
  }, [corpusKey, chunks.length]);

  // Grounded Answer Synthesis
  const handleGenerateAnswer = async () => {
    if (rerankedResults.length === 0) return;

    setIsGeneratingAnswer(true);
    try {
      const topChunks = rerankedResults.slice(0, 3).map((r, i) => ({
        id: r.chunk.id,
        chunkIndex: i + 1,
        text: r.chunk.text,
        metadata: r.chunk.metadata,
      }));

      const res = await fetch('/api/rag/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query,
          contextChunks: topChunks,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnswer(data.answer);
      } else {
        throw new Error('Server synthesis error');
      }
    } catch {
      // Fallback synthesis
      const fallback = `Based on retrieved passages:\n\n1. [Source 1] (${rerankedResults[0].chunk.metadata.title}): ${rerankedResults[0].chunk.text.slice(0, 180)}...\n\n2. [Source 2] (${rerankedResults[1]?.chunk.metadata.title || 'Related Document'}): ${rerankedResults[1]?.chunk.text.slice(0, 160) || ''}...\n\n*These retrieved passages directly address the question "${query}".*`;
      setAnswer(fallback);
    } finally {
      setIsGeneratingAnswer(false);
    }
  };

  // Run full benchmark suite
  const handleRunBenchmark = async () => {
    setIsRunningBenchmark(true);
    try {
      const results = await runBenchmarkSuite(
        benchmarks,
        chunks,
        bm25Engine,
        denseEngine,
        settings.rrf_k
      );
      setBenchmarkResults(results);
    } catch (err) {
      console.error('Error running benchmark suite:', err);
    } finally {
      setIsRunningBenchmark(false);
    }
  };

  // Add custom benchmark query
  const handleAddBenchmark = (newQuery: BenchmarkQuery) => {
    setBenchmarks((prev) => [newQuery, ...prev]);
  };

  // Add custom document
  const handleAddDocument = (newDoc: DocumentItem) => {
    setCustomDocuments((prev) => [newDoc, ...prev]);
  };

  const handleDeleteDocument = (docId: string) => {
    setCustomDocuments((prev) => prev.filter((d) => d.id !== docId));
  };

  const corporaOptions = Object.keys(DEFAULT_CORPORA).map((key) => ({
    key,
    name: DEFAULT_CORPORA[key].name,
  }));

  return (
    <div className="min-h-screen bg-[#0b0f19] text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      {/* Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        corpusKey={corpusKey}
        setCorpusKey={setCorpusKey}
        corporaOptions={corporaOptions}
        chunkCount={chunks.length}
        docCount={documents.length}
        isBackendConnected={isBackendConnected}
      />

      {/* Main Tab Content */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 lg:p-8">
        {activeTab === 'playground' && (
          <PlaygroundTab
            query={query}
            setQuery={setQuery}
            onSearch={executeSearch}
            isLoading={isLoading}
            rewriteMode={rewriteMode}
            setRewriteMode={setRewriteMode}
            rewriteResult={rewriteResult}
            bm25Results={bm25Results}
            denseResults={denseResults}
            hybridResults={hybridResults}
            rerankedResults={rerankedResults}
            metadataFilter={metadataFilter}
            setMetadataFilter={setMetadataFilter}
            availableCategories={availableCategories}
            availableTags={availableTags}
            sampleQueries={sampleQueries}
            answer={answer}
            isGeneratingAnswer={isGeneratingAnswer}
            onGenerateAnswer={handleGenerateAnswer}
          />
        )}

        {activeTab === 'experiments' && (
          <ExperimentsTab
            benchmarks={benchmarks}
            benchmarkResults={benchmarkResults}
            isRunningBenchmark={isRunningBenchmark}
            onRunBenchmark={handleRunBenchmark}
            onAddBenchmark={handleAddBenchmark}
            availableChunks={chunks}
          />
        )}

        {activeTab === 'pipeline' && (
          <PipelineFlowTab settings={settings} setSettings={setSettings} />
        )}

        {activeTab === 'corpus' && (
          <CorpusTab
            documents={documents}
            chunks={chunks}
            settings={settings}
            setSettings={setSettings}
            onAddDocument={handleAddDocument}
            onDeleteDocument={handleDeleteDocument}
          />
        )}

        {activeTab === 'readme' && (
          <ReadmeViewerTab readmeContent={readmeRaw} />
        )}
      </main>

      {/* Bottom Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950/60 py-4 px-6 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Advanced RAG Pipeline Workbench • Hybrid Search (BM25 + Dense) • Cross-Encoder Reranking • HyDE • IR Metrics
          </span>
          <button
            onClick={() => setActiveTab('readme')}
            className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors"
          >
            Read Architecture Blueprint (README.md) →
          </button>
        </div>
      </footer>
    </div>
  );
}
