import express from 'express';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
app.use(express.json({ limit: '15mb' }));

const port = Number(process.env.PORT) || 3000;
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey ? new GoogleGenAI({ apiKey }) : null;

// Status & diagnostics
app.get('/api/rag/status', (_req, res) => {
  res.json({
    status: 'online',
    hasApiKey: Boolean(apiKey && apiKey.length > 5),
    supportedModels: {
      llm: 'gemini-2.5-flash',
      embedding: 'text-embedding-004',
    },
    features: [
      'hybrid_search',
      'bm25',
      'vector_embeddings',
      'reciprocal_rank_fusion',
      'cross_encoder_rerank',
      'hyde_rewrite',
      'multi_query_expansion',
      'metadata_filter',
      'retrieval_benchmarks'
    ]
  });
});

// Dense Embeddings generation via Gemini API (batch supported)
app.post('/api/rag/embed', async (req, res) => {
  try {
    const { texts } = req.body;
    if (!texts || !Array.isArray(texts) || texts.length === 0) {
      return res.status(400).json({ error: 'texts array is required' });
    }

    if (!ai) {
      return res.status(200).json({
        fallback: true,
        message: 'No GEMINI_API_KEY configured. Use client-side embeddings engine.'
      });
    }

    // Embed content using Google GenAI SDK
    const embeddings: number[][] = [];
    for (const text of texts.slice(0, 50)) {
      try {
        const response = await ai.models.embedContent({
          model: 'text-embedding-004',
          contents: text,
        });
        const embValues = (response as any).embedding?.values || (response as any).embeddings?.[0]?.values;
        if (embValues) {
          embeddings.push(embValues);
        }
      } catch (err: any) {
        console.warn('Embedding generation warning:', err?.message || err);
        break;
      }
    }

    if (embeddings.length === texts.length) {
      return res.json({ embeddings, fallback: false });
    } else {
      return res.json({
        embeddings,
        fallback: true,
        message: 'Partial embedding or quota limit reached; using fallback similarity'
      });
    }
  } catch (err: any) {
    console.error('Error in /api/rag/embed:', err);
    res.status(500).json({ error: err.message || 'Internal error generating embeddings' });
  }
});

// Query Rewriting endpoint (HyDE, Multi-Query, Step-Back, Sub-Questions)
app.post('/api/rag/rewrite', async (req, res) => {
  try {
    const { query, mode, domainContext } = req.body;
    if (!query) {
      return res.status(400).json({ error: 'query is required' });
    }

    if (!ai) {
      return res.json({
        query,
        mode,
        rewritten: generateLocalRewrite(query, mode),
        isAiGenerated: false
      });
    }

    let prompt = '';
    if (mode === 'hyde') {
      prompt = `You are an expert AI retrieval assistant. Given the following user question, write a concise, hypothetical document snippet (2-4 sentences, ~60-80 words) that would directly and factually answer this question. Do not include introductory phrases like "Here is the answer". Just write the ideal answer passage.
User Question: "${query}"`;
    } else if (mode === 'multi_query') {
      prompt = `You are an AI assistant for Hybrid Information Retrieval. Generate exactly 3 distinct search query reformulations or diverse perspectives for the given user query. Focus on technical terminology, synonyms, and intent variations.
Return ONLY valid JSON in the format: {"queries": ["variation 1", "variation 2", "variation 3"]}
User Query: "${query}"`;
    } else if (mode === 'step_back') {
      prompt = `You are an AI reasoning assistant using the Step-Back Prompting technique. For the specific user query below, formulate a higher-level, more abstract, conceptual question that provides foundational context needed to answer the original question.
Return ONLY the single step-back question string.
Original Query: "${query}"`;
    } else if (mode === 'sub_questions') {
      prompt = `Decompose the complex user query into 2 to 3 self-contained, atomic sub-questions that together solve the whole question.
Return ONLY valid JSON in format: {"queries": ["sub-question 1", "sub-question 2"]}
User Query: "${query}"`;
    } else {
      prompt = `Improve the keyword specificity and semantic clarity of this search query for retrieval: "${query}". Return only the refined query.`;
    }

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';

    let parsedResult: any = text;
    if (mode === 'multi_query' || mode === 'sub_questions') {
      try {
        const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
        parsedResult = JSON.parse(cleaned).queries;
      } catch {
        parsedResult = text.split('\n').filter(Boolean).slice(0, 3);
      }
    }

    return res.json({
      originalQuery: query,
      mode,
      rewritten: parsedResult,
      isAiGenerated: true
    });
  } catch (err: any) {
    console.error('Error in /api/rag/rewrite:', err);
    res.json({
      query: req.body.query,
      mode: req.body.mode,
      rewritten: generateLocalRewrite(req.body.query, req.body.mode),
      isAiGenerated: false,
      fallbackReason: err.message
    });
  }
});

// Model Reranker / Cross-Encoder endpoint
app.post('/api/rag/rerank', async (req, res) => {
  try {
    const { query, documents } = req.body; // documents: array of { id, text, score? }
    if (!query || !documents || !Array.isArray(documents)) {
      return res.status(400).json({ error: 'query and documents array are required' });
    }

    if (!ai) {
      return res.json({
        reranked: computeLocalRerank(query, documents),
        isAiGenerated: false
      });
    }

    const docItems = documents.slice(0, 15).map((doc, idx) => `[Doc ${idx + 1}] (ID: ${doc.id})\n${doc.text.slice(0, 400)}`).join('\n\n');

    const prompt = `You are a cross-encoder reranker for a Retrieval-Augmented Generation (RAG) system.
Given the user query and candidate passages, evaluate the relevance of EACH passage to the query on a continuous scale from 0.00 to 1.00.
Also provide a 1-sentence explanation of why the passage is or is not relevant.

Query: "${query}"

Candidates:
${docItems}

Return valid JSON strictly adhering to this schema:
{
  "results": [
    {
      "id": "original document id",
      "relevance_score": 0.95,
      "reasoning": "Directly explains the specific mechanism requested in the query."
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    const text = response.text?.trim() || '';
    const cleaned = text.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleaned);

    return res.json({
      reranked: parsed.results,
      isAiGenerated: true
    });
  } catch (err: any) {
    console.warn('Fallback to local reranker due to:', err?.message);
    return res.json({
      reranked: computeLocalRerank(req.body.query, req.body.documents),
      isAiGenerated: false,
      fallbackReason: err.message
    });
  }
});

// Answer Generation with strict grounded attribution citations
app.post('/api/rag/generate', async (req, res) => {
  try {
    const { query, contextChunks } = req.body;
    if (!query || !contextChunks) {
      return res.status(400).json({ error: 'query and contextChunks are required' });
    }

    if (!ai) {
      return res.json({
        answer: generateLocalSynthesis(query, contextChunks),
        citations: contextChunks.slice(0, 3).map((c: any) => ({
          docId: c.docId || c.id,
          title: c.metadata?.title || 'Knowledge Base Document',
          chunkIndex: c.chunkIndex || 0,
          quote: c.text?.slice(0, 120) + '...'
        })),
        isAiGenerated: false
      });
    }

    const formattedContext = contextChunks.map((chunk: any, i: number) => {
      return `[Source ${i + 1}] (Doc: "${chunk.metadata?.title || 'Doc'}", Chunk ID: ${chunk.id})
${chunk.text}`;
    }).join('\n\n---\n\n');

    const prompt = `You are a high-precision RAG synthesis assistant.
Your task is to answer the user's question using ONLY the retrieved context passages provided below.
Rules:
1. Cite retrieved sources using inline brackets like [Source 1] or [Source 2] whenever making a claim.
2. If the retrieved context does not contain sufficient information to answer the question, state honestly what is known and what cannot be confirmed.
3. Be structured, concise, and technically rigorous.

User Question: "${query}"

Retrieved Context Passages:
${formattedContext}

Answer:`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return res.json({
      answer: response.text?.trim(),
      isAiGenerated: true,
      citations: contextChunks.map((c: any, i: number) => ({
        sourceNumber: i + 1,
        docId: c.id,
        title: c.metadata?.title || 'Document',
        chunkIndex: c.chunkIndex ?? i,
        excerpt: c.text?.slice(0, 140) + '...'
      }))
    });
  } catch (err: any) {
    console.error('Error generating answer:', err);
    res.json({
      answer: generateLocalSynthesis(req.body.query, req.body.contextChunks || []),
      isAiGenerated: false,
      fallbackReason: err.message
    });
  }
});

// Helper for local query rewriting fallback
function generateLocalRewrite(query: string, mode: string) {
  const terms = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(Boolean);
  if (mode === 'hyde') {
    return `In modern systems, ${query.replace(/\?$/, '')} is implemented using optimized algorithms, indexing strategies, and automated protocols designed to maximize throughput, minimize latency, and ensure reliable data consistency across nodes.`;
  } else if (mode === 'multi_query') {
    return [
      `Technical architecture and implementation of ${query}`,
      `Best practices, benchmarks, and trade-offs for ${terms.slice(0, 4).join(' ')}`,
      `How does ${query} compare with standard alternatives?`
    ];
  } else if (mode === 'step_back') {
    return `What are the core theoretical principles and architectural patterns underlying ${terms.slice(0, 3).join(' ')}?`;
  } else if (mode === 'sub_questions') {
    return [
      `What are the foundational definitions and components of ${terms[0] || 'the system'}?`,
      `How is ${query} operationalized in production environments?`
    ];
  }
  return query;
}

// Helper for local cross-encoder / heuristic reranking fallback
function computeLocalRerank(query: string, documents: any[]) {
  const queryTerms = query.toLowerCase().replace(/[^a-z0-9\s]/g, '').split(/\s+/).filter(w => w.length > 2);
  
  return documents.map(doc => {
    const textLower = doc.text.toLowerCase();
    let termMatches = 0;
    let exactPhraseBonus = textLower.includes(query.toLowerCase().trim()) ? 0.35 : 0;
    
    queryTerms.forEach(term => {
      if (textLower.includes(term)) termMatches++;
    });

    const ratio = queryTerms.length > 0 ? (termMatches / queryTerms.length) : 0.5;
    const baseScore = doc.score !== undefined ? (doc.score * 0.4) : 0.3;
    const relevanceScore = Math.min(0.99, Math.max(0.05, baseScore + (ratio * 0.45) + exactPhraseBonus));
    
    return {
      id: doc.id,
      relevance_score: Number(relevanceScore.toFixed(3)),
      reasoning: `Matches ${termMatches}/${queryTerms.length} key query terms with ${exactPhraseBonus > 0 ? 'exact phrase alignment' : 'semantic overlap'}.`
    };
  }).sort((a, b) => b.relevance_score - a.relevance_score);
}

// Local synthesis fallback
function generateLocalSynthesis(query: string, chunks: any[]) {
  if (!chunks || chunks.length === 0) {
    return `No relevant passages were found in the knowledge base matching "${query}". Try relaxing your metadata filters or broadening your search terms.`;
  }

  const topChunks = chunks.slice(0, 3);
  const synthesis = topChunks.map((c, i) => {
    const snippet = c.text.split('. ').slice(0, 2).join('. ') + '.';
    return `According to [Source ${i + 1}] (${c.metadata?.title || 'Document'}), ${snippet}`;
  }).join('\n\n');

  return `### Grounded Synthesis\n\n${synthesis}\n\n*This synthesis is constructed from ${topChunks.length} retrieved document passages.*`;
}

// Vite middleware in dev or static files in production
async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';
  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Advanced RAG Workbench server running at http://localhost:${port}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
