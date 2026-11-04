import { Chunk } from '../types/rag';

export interface DenseSearchResult {
  chunk: Chunk;
  score: number; // cosine similarity [0.0 - 1.0]
}

// 128-dimensional deterministic semantic projection vector generator
function generateLocalEmbedding(text: string, dim: number = 128): number[] {
  const vec = new Float32Array(dim);
  const words = text.toLowerCase().replace(/[^a-z0-9]/g, ' ').split(/\s+/).filter(Boolean);

  if (words.length === 0) return Array.from(vec);

  for (let i = 0; i < words.length; i++) {
    const word = words[i];
    // Hash word to seed multiple dimensions
    let hash = 0;
    for (let c = 0; c < word.length; c++) {
      hash = (hash << 5) - hash + word.charCodeAt(c);
      hash |= 0;
    }

    for (let d = 0; d < 4; d++) {
      const idx = Math.abs((hash ^ (d * 997)) % dim);
      const sign = ((hash >> (d * 3)) & 1) === 0 ? 1 : -1;
      vec[idx] += sign * (1.0 / Math.sqrt(words.length));
    }

    // Substring n-gram features
    if (word.length >= 4) {
      for (let s = 0; s <= word.length - 3; s++) {
        const sub = word.slice(s, s + 3);
        let subHash = 0;
        for (let sc = 0; sc < sub.length; sc++) {
          subHash = (subHash << 5) - subHash + sub.charCodeAt(sc);
          subHash |= 0;
        }
        const sIdx = Math.abs(subHash % dim);
        vec[sIdx] += 0.3 / Math.sqrt(words.length);
      }
    }
  }

  // L2 Normalize
  let norm = 0;
  for (let i = 0; i < dim; i++) {
    norm += vec[i] * vec[i];
  }
  norm = Math.sqrt(norm);
  if (norm > 0) {
    for (let i = 0; i < dim; i++) {
      vec[i] /= norm;
    }
  }

  return Array.from(vec);
}

export function cosineSimilarity(v1: number[], v2: number[]): number {
  if (v1.length !== v2.length || v1.length === 0) return 0;
  let dot = 0;
  let n1 = 0;
  let n2 = 0;

  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    n1 += v1[i] * v1[i];
    n2 += v2[i] * v2[i];
  }

  if (n1 === 0 || n2 === 0) return 0;
  const sim = dot / (Math.sqrt(n1) * Math.sqrt(n2));
  // Normalize to 0..1 scale for RAG display
  return Math.max(0, Math.min(1, (sim + 1) / 2));
}

export class DenseVectorEngine {
  private chunks: Chunk[] = [];
  private embeddings: number[][] = [];
  public isServerEmbeddings: boolean = false;

  public async index(chunks: Chunk[]): Promise<void> {
    this.chunks = chunks;

    // Try fetching real embeddings from backend
    try {
      const texts = chunks.map(c => `${c.metadata.title}: ${c.text}`);
      const res = await fetch('/api/rag/embed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texts })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.embeddings && data.embeddings.length === chunks.length) {
          this.embeddings = data.embeddings;
          this.isServerEmbeddings = !data.fallback;
          return;
        }
      }
    } catch {
      // Fallback seamlessly to local embeddings
    }

    // Local deterministic embedding generation
    this.embeddings = chunks.map(c => generateLocalEmbedding(`${c.metadata.title} ${c.text}`));
    this.isServerEmbeddings = false;
  }

  public async search(query: string, topK: number = 20): Promise<DenseSearchResult[]> {
    if (this.chunks.length === 0) return [];

    let queryVec: number[] = [];

    if (this.isServerEmbeddings) {
      try {
        const res = await fetch('/api/rag/embed', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ texts: [query] })
        });
        const data = await res.json();
        if (data.embeddings && data.embeddings.length > 0) {
          queryVec = data.embeddings[0];
        }
      } catch {
        queryVec = generateLocalEmbedding(query);
      }
    }

    if (queryVec.length === 0) {
      queryVec = generateLocalEmbedding(query);
    }

    const results: DenseSearchResult[] = [];

    for (let i = 0; i < this.chunks.length; i++) {
      const docVec = this.embeddings[i];
      if (!docVec) continue;

      const score = cosineSimilarity(queryVec, docVec);
      results.push({
        chunk: this.chunks[i],
        score: Number(score.toFixed(4)),
      });
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
