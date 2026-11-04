export interface DocumentItem {
  id: string;
  title: string;
  category: string;
  author: string;
  year: number;
  source: string;
  tags: string[];
  content: string;
}

export interface Chunk {
  id: string;
  docId: string;
  docTitle: string;
  text: string;
  tokenCount: number;
  chunkIndex: number;
  metadata: {
    title: string;
    category: string;
    author: string;
    year: number;
    source: string;
    tags: string[];
  };
  embedding?: number[];
}

export interface SearchResult {
  chunk: Chunk;
  score: number;
  rank: number;
  originalRank?: number;
  bm25Rank?: number;
  denseRank?: number;
  bm25Score?: number;
  denseScore?: number;
  rrfScore?: number;
  rerankScore?: number;
  rerankReasoning?: string;
  matchedTerms?: string[];
}

export type QueryRewriteMode = 'direct' | 'hyde' | 'multi_query' | 'step_back' | 'sub_questions';

export interface MetadataFilter {
  category?: string;
  author?: string;
  minYear?: number;
  maxYear?: number;
  selectedTags?: string[];
  source?: string;
}

export interface BenchmarkQuery {
  id: string;
  query: string;
  expectedChunkIds: string[];
  category: string;
  description: string;
}

export interface BenchmarkMetricResult {
  strategy: 'sparse_bm25' | 'dense_vector' | 'hybrid_rrf' | 'hybrid_reranked';
  label: string;
  hitRateAt1: number;
  hitRateAt3: number;
  hitRateAt5: number;
  mrr: number; // Mean Reciprocal Rank
  ndcgAt5: number; // NDCG@5
  precisionAt3: number;
  avgLatencyMs: number;
  queryResults: {
    queryId: string;
    query: string;
    retrievedIds: string[];
    firstHitRank: number | null;
    reciprocalRank: number;
    hitsAt5: number;
    latencyMs: number;
  }[];
}

export interface PipelineSettings {
  chunkSize: number;
  chunkOverlap: number;
  bm25_k1: number;
  bm25_b: number;
  rrf_k: number;
  denseWeight: number; // for relative score fusion if used
  rerankerTopK: number;
  rewriteMode: QueryRewriteMode;
  topK: number;
}
