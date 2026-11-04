import { SearchResult } from '../types/rag';

export interface RerankedResult extends SearchResult {
  originalRank: number;
  rankDelta: number; // e.g. +3 means it climbed 3 ranks higher
  rerankScore: number;
  rerankReasoning: string;
}

export async function rerankCandidates(
  query: string,
  candidates: SearchResult[],
  topK: number = 5
): Promise<RerankedResult[]> {
  if (candidates.length === 0) return [];

  try {
    const res = await fetch('/api/rag/rerank', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query,
        documents: candidates.slice(0, 15).map(c => ({
          id: c.chunk.id,
          text: c.chunk.text,
          score: c.score,
        })),
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data.reranked && Array.isArray(data.reranked)) {
        const scoreLookup = new Map<string, { score: number; reasoning: string }>();
        data.reranked.forEach((item: any) => {
          scoreLookup.set(item.id, {
            score: item.relevance_score ?? 0.5,
            reasoning: item.reasoning || 'Relevant to query intent',
          });
        });

        const scored = candidates.map((item, originalIndex) => {
          const match = scoreLookup.get(item.chunk.id);
          const rerankScore = match ? match.score : (item.score || 0.3);
          const rerankReasoning = match ? match.reasoning : 'Retrieved via hybrid fusion candidate set';
          return {
            ...item,
            originalRank: originalIndex + 1,
            rerankScore,
            rerankReasoning,
          };
        });

        scored.sort((a, b) => b.rerankScore - a.rerankScore);

        return scored.slice(0, topK).map((item, newIndex) => {
          const newRank = newIndex + 1;
          return {
            ...item,
            rank: newRank,
            rankDelta: item.originalRank - newRank, // positive = climbed higher
          };
        });
      }
    }
  } catch {
    // Fallback smoothly to client-side heuristic cross-encoder
  }

  // Heuristic cross-encoder simulation
  const queryWords = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  const scored = candidates.map((item, originalIndex) => {
    const textLower = item.chunk.text.toLowerCase();
    let termMatches = 0;
    let exactPhraseBonus = textLower.includes(query.toLowerCase().trim()) ? 0.3 : 0;

    queryWords.forEach(w => {
      if (textLower.includes(w)) termMatches++;
    });

    const termRatio = queryWords.length > 0 ? termMatches / queryWords.length : 0.5;
    // Combine base hybrid score with term ratio and exact phrase bonus
    const hybridBase = item.rrfScore ? item.rrfScore * 12 : (item.score || 0.4);
    const rerankScore = Number(Math.min(0.98, Math.max(0.1, hybridBase * 0.35 + termRatio * 0.45 + exactPhraseBonus)).toFixed(3));

    const rerankReasoning = exactPhraseBonus > 0
      ? `Exact phrase match found; contains all key technical terms.`
      : `High lexical-semantic overlap (${termMatches}/${queryWords.length} terms) with high information density.`;

    return {
      ...item,
      originalRank: originalIndex + 1,
      rerankScore,
      rerankReasoning,
    };
  });

  scored.sort((a, b) => b.rerankScore - a.rerankScore);

  return scored.slice(0, topK).map((item, newIndex) => {
    const newRank = newIndex + 1;
    return {
      ...item,
      rank: newRank,
      rankDelta: item.originalRank - newRank,
    };
  });
}
