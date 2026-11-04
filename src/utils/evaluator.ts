import { BenchmarkQuery, BenchmarkMetricResult, Chunk } from '../types/rag';
import { BM25Engine } from './bm25';
import { DenseVectorEngine } from './vectorEngine';
import { reciprocalRankFusion } from './hybridFusion';
import { rerankCandidates } from './reranker';

export async function runBenchmarkSuite(
  queries: BenchmarkQuery[],
  chunks: Chunk[],
  bm25Engine: BM25Engine,
  denseEngine: DenseVectorEngine,
  rrfK: number = 60
): Promise<BenchmarkMetricResult[]> {
  const strategies: ('sparse_bm25' | 'dense_vector' | 'hybrid_rrf' | 'hybrid_reranked')[] = [
    'sparse_bm25',
    'dense_vector',
    'hybrid_rrf',
    'hybrid_reranked',
  ];

  const results: BenchmarkMetricResult[] = [];

  for (const strategy of strategies) {
    let totalHitAt1 = 0;
    let totalHitAt3 = 0;
    let totalHitAt5 = 0;
    let totalRR = 0;
    let totalNdcg5 = 0;
    let totalPrec3 = 0;
    let totalLatency = 0;

    const queryResults: BenchmarkMetricResult['queryResults'] = [];

    for (const bQuery of queries) {
      const startTime = performance.now();
      let retrievedChunkIds: string[] = [];

      if (strategy === 'sparse_bm25') {
        const sparseResults = bm25Engine.search(bQuery.query, 10);
        retrievedChunkIds = sparseResults.map(r => r.chunk.id);
      } else if (strategy === 'dense_vector') {
        const denseResults = await denseEngine.search(bQuery.query, 10);
        retrievedChunkIds = denseResults.map(r => r.chunk.id);
      } else if (strategy === 'hybrid_rrf') {
        const sparse = bm25Engine.search(bQuery.query, 15);
        const dense = await denseEngine.search(bQuery.query, 15);
        const fused = reciprocalRankFusion(sparse, dense, rrfK, 10);
        retrievedChunkIds = fused.map(r => r.chunk.id);
      } else if (strategy === 'hybrid_reranked') {
        const sparse = bm25Engine.search(bQuery.query, 15);
        const dense = await denseEngine.search(bQuery.query, 15);
        const fused = reciprocalRankFusion(sparse, dense, rrfK, 12);
        const reranked = await rerankCandidates(bQuery.query, fused, 5);
        retrievedChunkIds = reranked.map(r => r.chunk.id);
      }

      const latencyMs = Math.round(performance.now() - startTime);
      totalLatency += latencyMs;

      // Find rank of first expected chunk
      const expectedSet = new Set(bQuery.expectedChunkIds);
      let firstHitRank: number | null = null;
      let hitsAt5 = 0;
      let hitsAt3 = 0;
      let dcg5 = 0;

      for (let i = 0; i < Math.min(5, retrievedChunkIds.length); i++) {
        const id = retrievedChunkIds[i];
        if (expectedSet.has(id)) {
          if (firstHitRank === null) {
            firstHitRank = i + 1;
          }
          hitsAt5++;
          if (i < 3) hitsAt3++;
          // Relevance score = 1
          dcg5 += 1 / Math.log2(i + 2); // i=0 => log2(2)=1
        }
      }

      // Calculate IDCG (Ideal DCG) for up to 5 items
      const maxPossibleHits = Math.min(5, bQuery.expectedChunkIds.length);
      let idcg5 = 0;
      for (let i = 0; i < maxPossibleHits; i++) {
        idcg5 += 1 / Math.log2(i + 2);
      }
      const ndcg5 = idcg5 > 0 ? dcg5 / idcg5 : 0;

      const reciprocalRank = firstHitRank ? 1 / firstHitRank : 0;
      if (firstHitRank === 1) totalHitAt1++;
      if (firstHitRank && firstHitRank <= 3) totalHitAt3++;
      if (firstHitRank && firstHitRank <= 5) totalHitAt5++;

      totalRR += reciprocalRank;
      totalNdcg5 += ndcg5;
      totalPrec3 += hitsAt3 / 3;

      queryResults.push({
        queryId: bQuery.id,
        query: bQuery.query,
        retrievedIds: retrievedChunkIds.slice(0, 5),
        firstHitRank,
        reciprocalRank,
        hitsAt5,
        latencyMs,
      });
    }

    const Q = queries.length || 1;
    let label = 'Sparse Lexical (BM25)';
    if (strategy === 'dense_vector') label = 'Dense Vector (Cosine)';
    if (strategy === 'hybrid_rrf') label = 'Hybrid (BM25 + Dense RRF)';
    if (strategy === 'hybrid_reranked') label = 'Advanced (Hybrid + Cross-Encoder)';

    results.push({
      strategy,
      label,
      hitRateAt1: Number((totalHitAt1 / Q).toFixed(3)),
      hitRateAt3: Number((totalHitAt3 / Q).toFixed(3)),
      hitRateAt5: Number((totalHitAt5 / Q).toFixed(3)),
      mrr: Number((totalRR / Q).toFixed(3)),
      ndcgAt5: Number((totalNdcg5 / Q).toFixed(3)),
      precisionAt3: Number((totalPrec3 / Q).toFixed(3)),
      avgLatencyMs: Math.round(totalLatency / Q),
      queryResults,
    });
  }

  return results;
}
