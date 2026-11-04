import React, { useState } from 'react';
import { 
  Workflow, 
  Code2, 
  Copy, 
  Check, 
  Sliders, 
  HelpCircle, 
  Layers, 
  Cpu, 
  Search, 
  Filter, 
  ArrowRight,
  Database,
  Sparkles,
  BookOpen
} from 'lucide-react';
import { PipelineSettings } from '../types/rag';

interface PipelineFlowTabProps {
  settings: PipelineSettings;
  setSettings: React.Dispatch<React.SetStateAction<PipelineSettings>>;
}

interface StageDetail {
  id: string;
  number: number;
  title: string;
  category: 'Ingestion' | 'Indexing' | 'Querying' | 'Ranking' | 'Synthesis';
  description: string;
  mathFormula?: string;
  formulaExplanation?: string;
  failureModePrevented: string;
  pythonSnippet: string;
  typescriptSnippet: string;
}

const STAGES: StageDetail[] = [
  {
    id: 'stage_chunking',
    number: 1,
    title: 'Document Ingestion & Chunking',
    category: 'Ingestion',
    description: 'Decomposes raw documents into overlapping semantic token windows while retaining document identifiers, hierarchical headers, and metadata payloads.',
    mathFormula: 'W_{i} = [T_{i \\cdot (S - O)}, \\dots, T_{i \\cdot (S - O) + S}]',
    formulaExplanation: 'Where S is Chunk Size (tokens), O is Overlap (tokens), ensuring boundary context continuity across passages.',
    failureModePrevented: 'Lost context across paragraph splits and token length truncation inside embedding models.',
    pythonSnippet: `def chunk_document(text: str, chunk_size=350, chunk_overlap=50):
    words = text.split()
    chunks = []
    step = chunk_size - chunk_overlap
    for i in range(0, len(words), step):
        chunk_words = words[i:i + chunk_size]
        chunks.append({
            "text": " ".join(chunk_words),
            "token_count": len(chunk_words),
            "chunk_idx": len(chunks)
        })
    return chunks`,
    typescriptSnippet: `export function chunkText(text: string, size = 300, overlap = 40) {
  const words = text.split(/\\s+/);
  const chunks = [];
  const step = size - overlap;
  for (let i = 0; i < words.length; i += step) {
    chunks.push(words.slice(i, i + size).join(' '));
  }
  return chunks;
}`
  },
  {
    id: 'stage_bm25',
    number: 2,
    title: 'Sparse Inverted Index (Okapi BM25)',
    category: 'Indexing',
    description: 'Indexes terms into an inverted index and computes Robertson-Spärck Jones IDF and term-frequency saturation.',
    mathFormula: 'Score(D, Q) = \\sum_{q \\in Q} \\text{IDF}(q) \\cdot \\frac{f(q, D) \\cdot (k_1 + 1)}{f(q, D) + k_1 \\cdot \\left(1 - b + b \\cdot \\frac{|D|}{\\text{avgdl}}\\right)}',
    formulaExplanation: 'k_1 controls term frequency saturation (standard 1.2 to 2.0). b controls document length penalty (standard 0.75).',
    failureModePrevented: 'Dense vector blindness to exact serial numbers, error codes, product SKUs, and rare medical/financial terms.',
    pythonSnippet: `from rank_bm25 import BM25Okapi

tokenized_corpus = [doc.lower().split() for doc in corpus]
bm25 = BM25Okapi(tokenized_corpus)
scores = bm25.get_scores(query.lower().split())`,
    typescriptSnippet: `// Pure TypeScript BM25 search
const idf = Math.log((N - df + 0.5) / (df + 0.5) + 1.0);
const score = idf * ((tf * (k1 + 1)) / (tf + k1 * (1 - b + b * (dl / avgdl))));`
  },
  {
    id: 'stage_dense',
    number: 3,
    title: 'Dense Vector Embeddings & ANN',
    category: 'Indexing',
    description: 'Generates latent semantic vectors (e.g. text-embedding-004) and indices them into HNSW vector graphs for approximate nearest neighbor search.',
    mathFormula: '\\text{CosineSim}(\\vec{u}, \\vec{v}) = \\frac{\\vec{u} \\cdot \\vec{v}}{\\|\\vec{u}\\|_2 \\cdot \\|\\vec{v}\\|_2}',
    formulaExplanation: 'Maps high-dimensional text representations onto a unit hypersphere where semantic angle defines relevance.',
    failureModePrevented: 'Keyword mismatch where users use synonyms ("cut cloud bill") instead of exact index terms ("cost optimization").',
    pythonSnippet: `from google import genai

ai = genai.Client()
response = ai.models.embed_content(
    model="text-embedding-004",
    contents=text
)
vector = response.embedding.values`,
    typescriptSnippet: `const response = await ai.models.embedContent({
  model: 'text-embedding-004',
  contents: text
});
const vector = response.embedding.values;`
  },
  {
    id: 'stage_rewrite',
    number: 4,
    title: 'Query Rewriting (HyDE & Multi-Query)',
    category: 'Querying',
    description: 'Transforms telegraphic or underspecified user questions into hypothetical answer passages (HyDE) or multiple search perspectives.',
    mathFormula: 'Q_{\\text{HyDE}} = \\text{Embed}(\\text{LLM}_{\\text{hypo}}(Q))',
    formulaExplanation: 'Embeds the generated hypothetical passage so the search vector lands directly in the document distribution space.',
    failureModePrevented: 'Short questions failing to align with dense explanatory passages in vector space.',
    pythonSnippet: `hyde_prompt = f"Write a hypothetical passage answering: {query}"
hypo_doc = llm.generate_content(hyde_prompt).text
search_vector = embed_model.get_embedding(hypo_doc)`,
    typescriptSnippet: `const hypoDoc = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: \`Write a concise passage answering: "\${query}"\`
});`
  },
  {
    id: 'stage_filter',
    number: 5,
    title: 'Dynamic Metadata Filtering',
    category: 'Querying',
    description: 'Prunes documents based on categorical tags, department scopes, or temporal bounds (pre-filtering within the vector graph traversal).',
    mathFormula: 'D_{\\text{filtered}} = \\{ d \\in D \\mid \\text{Eval}(d.\\text{metadata}, \\text{Criteria}) = \\text{True} \\}',
    formulaExplanation: 'Single-stage in-graph filtering ensures exactly K candidates are returned without retrieval starvation.',
    failureModePrevented: 'Post-filtering returning 0 results because the top 100 vector matches belonged to excluded years or unauthorized roles.',
    pythonSnippet: `# Qdrant / Milvus single-stage payload filter
qdrant_client.search(
    collection_name="docs",
    query_vector=query_vec,
    query_filter=models.Filter(
        must=[models.FieldCondition(key="year", range=models.Range(gte=2023))]
    ),
    limit=20
)`,
    typescriptSnippet: `const validChunks = chunks.filter(c => 
  (!filter.category || c.metadata.category === filter.category) &&
  (!filter.minYear || c.metadata.year >= filter.minYear)
);`
  },
  {
    id: 'stage_rrf',
    number: 6,
    title: 'Hybrid Fusion (Reciprocal Rank Fusion)',
    category: 'Ranking',
    description: 'Combines rank positions from disparate scoring models (BM25 and Cosine Vector) without requiring score normalization.',
    mathFormula: '\\text{RRF}(d) = \\sum_{m \\in M} \\frac{1}{k + \\text{rank}_m(d)}',
    formulaExplanation: 'k is a smoothing constant (standard 60). Ensures rank stability across unbounded BM25 and bounded cosine ranges.',
    failureModePrevented: 'Calibration mismatch where one retrieval system completely dominates the other due to scale disparity.',
    pythonSnippet: `def reciprocal_rank_fusion(dense_ranks, sparse_ranks, k=60):
    rrf_scores = {}
    for r, doc_id in enumerate(dense_ranks, 1):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + r)
    for r, doc_id in enumerate(sparse_ranks, 1):
        rrf_scores[doc_id] = rrf_scores.get(doc_id, 0) + 1 / (k + r)
    return sorted(rrf_scores.items(), key=lambda x: x[1], reverse=True)`,
    typescriptSnippet: `for (const [id, rank] of denseRanks) {
  scores.set(id, (scores.get(id) || 0) + 1 / (k + rank));
}`
  },
  {
    id: 'stage_rerank',
    number: 7,
    title: 'Cross-Encoder Reranker',
    category: 'Ranking',
    description: 'Computes deep full-attention interaction across [CLS] Query [SEP] Document [SEP] pairs to produce accurate relevance probabilities.',
    mathFormula: 'P(\\text{Relevant} \\mid Q, D) = \\sigma(W \\cdot \\text{Transformer}([Q \\;; D]))',
    formulaExplanation: 'Every token in the query attends to every token in the passage across all attention heads.',
    failureModePrevented: 'Bi-encoder information loss where high cosine similarity matches semantic style rather than factual answer content.',
    pythonSnippet: `from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')
pairs = [[query, doc.text] for doc in candidate_docs]
scores = reranker.predict(pairs)`,
    typescriptSnippet: `const response = await ai.models.generateContent({
  model: 'gemini-2.5-flash',
  contents: \`Score relevance [0.00 - 1.00] for query: "\${query}" and candidates...\`
});`
  },
  {
    id: 'stage_synthesis',
    number: 8,
    title: 'Grounded Synthesis & Attribution',
    category: 'Synthesis',
    description: 'Feeds top reranked chunks into the LLM context window with strict formatting instructions and inline source citations.',
    mathFormula: 'Y = \\text{LLM}(Q, \\{C_1, C_2, \\dots, C_K\\}, \\text{Instruction}_{\\text{cite}})',
    formulaExplanation: 'Conditions generation solely on retrieved context and enforces [Source X] attribution tags.',
    failureModePrevented: 'Hallucination and unsupported claims by constraining generation to explicit retrieved evidence.',
    pythonSnippet: `prompt = f"""Answer strictly using the retrieved sources below.
Sources: {context_text}
Question: {query}"""
answer = llm.generate_content(prompt)`,
    typescriptSnippet: `const prompt = \`Answer using only retrieved sources. Cite [Source X].
Query: "\${query}"
Passages: \${contextPassages}\`;`
  }
];

export const PipelineFlowTab: React.FC<PipelineFlowTabProps> = ({
  settings,
  setSettings,
}) => {
  const [selectedStageId, setSelectedStageId] = useState<string>('stage_rrf');
  const [copiedLanguage, setCopiedLanguage] = useState<'python' | 'ts' | null>(null);

  const activeStage = STAGES.find((s) => s.id === selectedStageId) || STAGES[0];

  const handleCopyCode = (code: string, lang: 'python' | 'ts') => {
    navigator.clipboard.writeText(code);
    setCopiedLanguage(lang);
    setTimeout(() => setCopiedLanguage(null), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Interactive Visual Pipeline Diagram */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-2">
          <div>
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Workflow className="w-5 h-5 text-cyan-400" />
              <span>Interactive Pipeline Architecture Explorer</span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any stage below to inspect its mathematical formulation, failure modes, tunable parameters, and copy-pasteable code recipes.
            </p>
          </div>
          <span className="text-xs font-mono text-cyan-400 bg-cyan-950/80 px-2.5 py-1 rounded-lg border border-cyan-800">
            8 Production Stages
          </span>
        </div>

        {/* Visual Flow Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2 pt-2">
          {STAGES.map((stage) => {
            const isSelected = stage.id === selectedStageId;
            return (
              <button
                key={stage.id}
                onClick={() => setSelectedStageId(stage.id)}
                className={`flex flex-col items-center justify-center p-3 rounded-xl border text-center transition-all ${
                  isSelected
                    ? 'bg-gradient-to-b from-cyan-950/60 to-slate-900 border-cyan-400 shadow-lg shadow-cyan-950/40 ring-1 ring-cyan-400'
                    : 'bg-slate-950/70 border-slate-800 hover:border-slate-700 hover:bg-slate-900'
                }`}
              >
                <span
                  className={`w-6 h-6 rounded-full text-xs font-bold flex items-center justify-center mb-1.5 ${
                    isSelected ? 'bg-cyan-500 text-slate-950' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {stage.number}
                </span>
                <span className="text-[11px] font-bold text-slate-200 leading-tight">
                  {stage.title.split(' ')[0]}
                </span>
                <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">
                  {stage.category}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Selected Stage Deep Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Stage Blueprint & Theory */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-5 shadow-lg">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <span className="w-7 h-7 rounded-lg bg-cyan-950 text-cyan-400 border border-cyan-800 font-bold text-xs flex items-center justify-center">
                  #{activeStage.number}
                </span>
                <h3 className="text-base font-bold text-white">{activeStage.title}</h3>
              </div>
              <span className="text-xs uppercase font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded">
                {activeStage.category}
              </span>
            </div>

            {/* Description */}
            <p className="text-xs md:text-sm text-slate-300 leading-relaxed">
              {activeStage.description}
            </p>

            {/* Mathematical Formula Card */}
            {activeStage.mathFormula && (
              <div className="bg-slate-950 border border-cyan-900/40 rounded-xl p-4 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-cyan-400 uppercase tracking-wider">
                  <span>Mathematical Formulation</span>
                </div>
                <div className="bg-slate-900/90 p-3 rounded-lg font-mono text-xs md:text-sm text-cyan-300 overflow-x-auto text-center py-2">
                  {activeStage.mathFormula}
                </div>
                {activeStage.formulaExplanation && (
                  <p className="text-xs text-slate-400 italic">
                    {activeStage.formulaExplanation}
                  </p>
                )}
              </div>
            )}

            {/* Failure Mode Card */}
            <div className="bg-rose-950/20 border border-rose-900/40 rounded-xl p-4 space-y-1">
              <span className="text-xs font-bold text-rose-400 uppercase tracking-wider block">
                Naive RAG Failure Mode Prevented
              </span>
              <p className="text-xs text-slate-300">{activeStage.failureModePrevented}</p>
            </div>
          </div>

          {/* Interactive Parameter Tuning for this Stage */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 space-y-4 shadow-lg">
            <div className="flex items-center gap-2 mb-2">
              <Sliders className="w-4 h-4 text-cyan-400" />
              <h4 className="text-sm font-bold text-white">Live Pipeline Parameter Controls</h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* BM25 k1 */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 font-semibold">BM25 k₁ (Saturation)</span>
                  <span className="font-mono text-cyan-400">{settings.bm25_k1}</span>
                </div>
                <input
                  type="range"
                  min="0.8"
                  max="2.5"
                  step="0.1"
                  value={settings.bm25_k1}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, bm25_k1: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* BM25 b */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 font-semibold">BM25 b (Length Penalty)</span>
                  <span className="font-mono text-cyan-400">{settings.bm25_b}</span>
                </div>
                <input
                  type="range"
                  min="0.1"
                  max="1.0"
                  step="0.05"
                  value={settings.bm25_b}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, bm25_b: Number(e.target.value) }))
                  }
                  className="w-full accent-cyan-500"
                />
              </div>

              {/* RRF k */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 font-semibold">RRF Smoothing Constant (k)</span>
                  <span className="font-mono text-purple-400">{settings.rrf_k}</span>
                </div>
                <input
                  type="range"
                  min="10"
                  max="120"
                  step="5"
                  value={settings.rrf_k}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, rrf_k: Number(e.target.value) }))
                  }
                  className="w-full accent-purple-500"
                />
              </div>

              {/* Chunk Size */}
              <div>
                <div className="flex justify-between mb-1">
                  <span className="text-slate-300 font-semibold">Chunk Window Size</span>
                  <span className="font-mono text-indigo-400">{settings.chunkSize} tokens</span>
                </div>
                <input
                  type="range"
                  min="100"
                  max="600"
                  step="50"
                  value={settings.chunkSize}
                  onChange={(e) =>
                    setSettings((prev) => ({ ...prev, chunkSize: Number(e.target.value) }))
                  }
                  className="w-full accent-indigo-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Copyable Implementation Code Recipes */}
        <div className="lg:col-span-5 space-y-4">
          {/* Python Code Block */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-amber-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>Python Implementation</span>
              </span>
              <button
                onClick={() => handleCopyCode(activeStage.pythonSnippet, 'python')}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded"
              >
                {copiedLanguage === 'python' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedLanguage === 'python' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3.5 rounded-xl text-xs text-slate-200 overflow-x-auto font-mono leading-relaxed max-h-56">
              {activeStage.pythonSnippet}
            </pre>
          </div>

          {/* TypeScript Code Block */}
          <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <span className="text-xs font-bold text-blue-400 flex items-center gap-1.5">
                <Code2 className="w-3.5 h-3.5" />
                <span>TypeScript Implementation</span>
              </span>
              <button
                onClick={() => handleCopyCode(activeStage.typescriptSnippet, 'ts')}
                className="flex items-center gap-1 text-[11px] font-semibold text-slate-300 hover:text-white bg-slate-800 px-2 py-1 rounded"
              >
                {copiedLanguage === 'ts' ? (
                  <Check className="w-3 h-3 text-emerald-400" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedLanguage === 'ts' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <pre className="bg-slate-950 p-3.5 rounded-xl text-xs text-slate-200 overflow-x-auto font-mono leading-relaxed max-h-56">
              {activeStage.typescriptSnippet}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
