import { Chunk } from '../types/rag';

const STOPWORDS = new Set([
  'a', 'about', 'above', 'after', 'again', 'against', 'all', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'below', 'between', 'both', 'but', 'by',
  'can', 'did', 'do', 'does', 'doing', 'down', 'during',
  'each', 'few', 'for', 'from', 'further',
  'had', 'has', 'have', 'having', 'he', 'her', 'here', 'hers', 'herself', 'him', 'himself', 'his', 'how',
  'i', 'if', 'in', 'into', 'is', 'it', 'its', 'itself',
  'just', 'me', 'more', 'most', 'my', 'myself',
  'no', 'nor', 'not', 'now',
  'of', 'off', 'on', 'once', 'only', 'or', 'other', 'our', 'ours', 'ourselves', 'out', 'over', 'own',
  'same', 'she', 'should', 'so', 'some', 'such',
  'than', 'that', 'the', 'their', 'theirs', 'them', 'themselves', 'then', 'there', 'these', 'they', 'this', 'those', 'through', 'to', 'too',
  'under', 'until', 'up', 'very',
  'was', 'we', 'were', 'what', 'when', 'where', 'which', 'while', 'who', 'whom', 'why', 'with',
  'you', 'your', 'yours', 'yourself', 'yourselves'
]);

export interface BM25SearchResult {
  chunk: Chunk;
  score: number;
  matchedTerms: string[];
  termBreakdown: { term: string; idf: number; tf: number; contribution: number }[];
}

export class BM25Engine {
  private chunks: Chunk[] = [];
  private docLengths: number[] = [];
  private avgdl: number = 0;
  private invertedIndex: Map<string, { docIdx: number; tf: number }[]> = new Map();
  private idfMap: Map<string, number> = new Map();
  public k1: number;
  public b: number;

  constructor(k1: number = 1.5, b: number = 0.75) {
    this.k1 = k1;
    this.b = b;
  }

  public tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, ' ')
      .split(/\s+/)
      .filter(w => w.length > 1 && !STOPWORDS.has(w));
  }

  public index(chunks: Chunk[]) {
    this.chunks = chunks;
    this.invertedIndex.clear();
    this.idfMap.clear();
    this.docLengths = [];

    const N = chunks.length;
    if (N === 0) {
      this.avgdl = 0;
      return;
    }

    let totalLength = 0;
    const docTermFreqs: Map<string, number>[] = [];

    for (let i = 0; i < N; i++) {
      const tokens = this.tokenize(chunks[i].text);
      this.docLengths.push(tokens.length);
      totalLength += tokens.length;

      const tfMap = new Map<string, number>();
      for (const token of tokens) {
        tfMap.set(token, (tfMap.get(token) || 0) + 1);
      }
      docTermFreqs.push(tfMap);

      for (const [term, tf] of tfMap.entries()) {
        if (!this.invertedIndex.has(term)) {
          this.invertedIndex.set(term, []);
        }
        this.invertedIndex.get(term)!.push({ docIdx: i, tf });
      }
    }

    this.avgdl = totalLength / N;

    // Calculate Robertson-Spärck Jones IDF for all terms
    for (const [term, postings] of this.invertedIndex.entries()) {
      const df = postings.length;
      // Formula: ln((N - df + 0.5) / (df + 0.5) + 1.0)
      const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0);
      this.idfMap.set(term, Math.max(0.01, idf));
    }
  }

  public search(query: string, topK: number = 20): BM25SearchResult[] {
    if (this.chunks.length === 0) return [];

    const queryTerms = this.tokenize(query);
    if (queryTerms.length === 0) return [];

    const scores = new Float32Array(this.chunks.length);
    const matchedTermsPerDoc: Set<string>[] = Array.from({ length: this.chunks.length }, () => new Set());
    const breakdownPerDoc: { term: string; idf: number; tf: number; contribution: number }[][] = Array.from(
      { length: this.chunks.length },
      () => []
    );

    for (const term of queryTerms) {
      const postings = this.invertedIndex.get(term);
      if (!postings) continue;

      const idf = this.idfMap.get(term) || 0.01;

      for (const { docIdx, tf } of postings) {
        const dl = this.docLengths[docIdx];
        const denom = tf + this.k1 * (1 - this.b + this.b * (dl / Math.max(1, this.avgdl)));
        const contribution = idf * ((tf * (this.k1 + 1)) / denom);

        scores[docIdx] += contribution;
        matchedTermsPerDoc[docIdx].add(term);
        breakdownPerDoc[docIdx].push({
          term,
          idf: Number(idf.toFixed(3)),
          tf,
          contribution: Number(contribution.toFixed(3)),
        });
      }
    }

    const results: BM25SearchResult[] = [];
    for (let i = 0; i < this.chunks.length; i++) {
      if (scores[i] > 0) {
        results.push({
          chunk: this.chunks[i],
          score: Number(scores[i].toFixed(4)),
          matchedTerms: Array.from(matchedTermsPerDoc[i]),
          termBreakdown: breakdownPerDoc[i],
        });
      }
    }

    results.sort((a, b) => b.score - a.score);
    return results.slice(0, topK);
  }
}
