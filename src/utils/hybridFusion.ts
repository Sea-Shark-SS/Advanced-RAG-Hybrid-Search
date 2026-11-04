import { Chunk, SearchResult } from '../types/rag';
import { BM25SearchResult } from './bm25';
import { DenseSearchResult } from './vectorEngine';

export function reciprocalRankFusion(
  bm25Results: BM25SearchResult[],
  denseResults: DenseSearchResult[],
  k: number = 60,
  topK: number = 15
): SearchResult[] {
  const rrfScoreMap = new Map<string, number>();
  const chunkMap = new Map<string, Chunk>();
  const bm25RankMap = new Map<string, number>();
  const denseRankMap = new Map<string, number>();
  const bm25ScoreMap = new Map<string, number>();
  const denseScoreMap = new Map<string, number>();
  const matchedTermsMap = new Map<string, string[]>();

  // Index BM25 ranks
  bm25Results.forEach((res, index) => {
    const rank = index + 1;
    chunkMap.set(res.chunk.id, res.chunk);
    bm25RankMap.set(res.chunk.id, rank);
    bm25ScoreMap.set(res.chunk.id, res.score);
    matchedTermsMap.set(res.chunk.id, res.matchedTerms);

    const currentScore = rrfScoreMap.get(res.chunk.id) || 0;
    rrfScoreMap.set(res.chunk.id, currentScore + 1 / (k + rank));
  });

  // Index Dense ranks
  denseResults.forEach((res, index) => {
    const rank = index + 1;
    chunkMap.set(res.chunk.id, res.chunk);
    denseRankMap.set(res.chunk.id, rank);
    denseScoreMap.set(res.chunk.id, res.score);

    const currentScore = rrfScoreMap.get(res.chunk.id) || 0;
    rrfScoreMap.set(res.chunk.id, currentScore + 1 / (k + rank));
  });

  // Sort descending by RRF score
  const sortedEntries = Array.from(rrfScoreMap.entries()).sort((a, b) => b[1] - a[1]);

  return sortedEntries.slice(0, topK).map(([chunkId, rrfScore], index) => {
    const chunk = chunkMap.get(chunkId)!;
    return {
      chunk,
      score: Number(rrfScore.toFixed(5)),
      rank: index + 1,
      bm25Rank: bm25RankMap.get(chunkId),
      denseRank: denseRankMap.get(chunkId),
      bm25Score: bm25ScoreMap.get(chunkId),
      denseScore: denseScoreMap.get(chunkId),
      rrfScore: Number(rrfScore.toFixed(5)),
      matchedTerms: matchedTermsMap.get(chunkId) || [],
    };
  });
}

// Relative Score Fusion (RSF): Min-Max normalizes both modalities and computes alpha * Dense + (1 - alpha) * BM25
export function relativeScoreFusion(
  bm25Results: BM25SearchResult[],
  denseResults: DenseSearchResult[],
  denseWeight: number = 0.5,
  topK: number = 15
): SearchResult[] {
  const chunkMap = new Map<string, Chunk>();
  const normBm25 = new Map<string, number>();
  const normDense = new Map<string, number>();
  const rawBm25 = new Map<string, number>();
  const rawDense = new Map<string, number>();
  const matchedTermsMap = new Map<string, string[]>();

  // Normalize BM25
  const maxBm25 = Math.max(...bm25Results.map(r => r.score), 0.0001);
  const minBm25 = Math.min(...bm25Results.map(r => r.score), 0);
  bm25Results.forEach(r => {
    chunkMap.set(r.chunk.id, r.chunk);
    rawBm25.set(r.chunk.id, r.score);
    matchedTermsMap.set(r.chunk.id, r.matchedTerms);
    const norm = (r.score - minBm25) / (maxBm25 - minBm25 || 1);
    normBm25.set(r.chunk.id, norm);
  });

  // Normalize Dense
  const maxDense = Math.max(...denseResults.map(r => r.score), 0.0001);
  const minDense = Math.min(...denseResults.map(r => r.score), 0);
  denseResults.forEach(r => {
    chunkMap.set(r.chunk.id, r.chunk);
    rawDense.set(r.chunk.id, r.score);
    const norm = (r.score - minDense) / (maxDense - minDense || 1);
    normDense.set(r.chunk.id, norm);
  });

  const allChunkIds = new Set([...Array.from(normBm25.keys()), ...Array.from(normDense.keys())]);
  const fused: { id: string; score: number }[] = [];

  for (const id of allChunkIds) {
    const bScore = normBm25.get(id) || 0;
    const dScore = normDense.get(id) || 0;
    const combined = denseWeight * dScore + (1 - denseWeight) * bScore;
    fused.push({ id, score: combined });
  }

  fused.sort((a, b) => b.score - a.score);

  return fused.slice(0, topK).map((item, index) => {
    const chunk = chunkMap.get(item.id)!;
    return {
      chunk,
      score: Number(item.score.toFixed(4)),
      rank: index + 1,
      bm25Score: rawBm25.get(item.id),
      denseScore: rawDense.get(item.id),
      matchedTerms: matchedTermsMap.get(item.id) || [],
    };
  });
}
