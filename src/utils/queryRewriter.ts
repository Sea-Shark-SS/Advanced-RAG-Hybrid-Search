import { QueryRewriteMode } from '../types/rag';

export interface RewriteResult {
  originalQuery: string;
  mode: QueryRewriteMode;
  rewrittenQueries: string[];
  hypotheticalDoc?: string;
  isAiGenerated: boolean;
  explanation: string;
}

export async function rewriteQuery(query: string, mode: QueryRewriteMode): Promise<RewriteResult> {
  if (mode === 'direct') {
    return {
      originalQuery: query,
      mode: 'direct',
      rewrittenQueries: [query],
      isAiGenerated: false,
      explanation: 'Using user raw query directly without transformation.',
    };
  }

  try {
    const res = await fetch('/api/rag/rewrite', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query, mode }),
    });

    if (res.ok) {
      const data = await res.json();
      if (mode === 'hyde') {
        const doc = typeof data.rewritten === 'string' ? data.rewritten : String(data.rewritten);
        return {
          originalQuery: query,
          mode: 'hyde',
          rewrittenQueries: [query],
          hypotheticalDoc: doc,
          isAiGenerated: data.isAiGenerated ?? true,
          explanation: 'HyDE generated a synthetic passage matching the target document distribution to guide dense vector search.',
        };
      } else if (mode === 'multi_query' || mode === 'sub_questions') {
        const queries = Array.isArray(data.rewritten) ? data.rewritten : [data.rewritten];
        return {
          originalQuery: query,
          mode,
          rewrittenQueries: queries.length > 0 ? queries : [query],
          isAiGenerated: data.isAiGenerated ?? true,
          explanation: mode === 'multi_query'
            ? 'Expanded original query into 3 complementary semantic perspectives.'
            : 'Decomposed composite query into atomic sub-questions.',
        };
      } else if (mode === 'step_back') {
        const stepBack = typeof data.rewritten === 'string' ? data.rewritten : String(data.rewritten);
        return {
          originalQuery: query,
          mode: 'step_back',
          rewrittenQueries: [stepBack, query],
          isAiGenerated: data.isAiGenerated ?? true,
          explanation: 'Step-Back Prompting generated a higher-level conceptual principle query to retrieve foundational context.',
        };
      }
    }
  } catch {
    // Fallback to client heuristics
  }

  // Client-side heuristic fallbacks
  const terms = query.replace(/[^a-zA-Z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (mode === 'hyde') {
    return {
      originalQuery: query,
      mode: 'hyde',
      rewrittenQueries: [query],
      hypotheticalDoc: `In production software architecture, ${query.replace(/\?$/, '')} is implemented using specialized consensus algorithms, distributed queues, or hybrid indexes. The system prevents race conditions, enforces transactional invariants, and optimizes latency.`,
      isAiGenerated: false,
      explanation: 'Synthetic answer snippet generated to bridge question-to-answer semantic gap.',
    };
  } else if (mode === 'multi_query') {
    return {
      originalQuery: query,
      mode: 'multi_query',
      rewrittenQueries: [
        query,
        `Technical mechanism and architecture of ${terms.slice(0, 4).join(' ')}`,
        `Best practices and failure recovery for ${terms.slice(-3).join(' ')}`,
      ],
      isAiGenerated: false,
      explanation: 'Generated 3 perspective variants covering mechanisms, architecture, and edge cases.',
    };
  } else if (mode === 'step_back') {
    return {
      originalQuery: query,
      mode: 'step_back',
      rewrittenQueries: [`What are the core foundational principles of ${terms.slice(0, 3).join(' ')}?`, query],
      isAiGenerated: false,
      explanation: 'Step-back question formulated to retrieve high-level principles.',
    };
  } else if (mode === 'sub_questions') {
    return {
      originalQuery: query,
      mode: 'sub_questions',
      rewrittenQueries: [
        `What is the primary definition and role of ${terms[0] || 'the system'}?`,
        `How is ${query} resolved in runtime environments?`,
      ],
      isAiGenerated: false,
      explanation: 'Decomposed into foundational definition and operational mechanics sub-queries.',
    };
  }

  return {
    originalQuery: query,
    mode: 'direct',
    rewrittenQueries: [query],
    isAiGenerated: false,
    explanation: 'Direct query execution.',
  };
}
