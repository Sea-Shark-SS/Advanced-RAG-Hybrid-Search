# Advanced RAG Pipeline: Hybrid Search, Reranking & Retrieval Experiments

[![Production Ready Architecture](https://img.shields.io/badge/Architecture-Advanced%20RAG-00f2fe?style=for-the-badge&logo=openai)](README.md)
[![TypeScript / React 19](https://img.shields.io/badge/Frontend-React%2019%20%2B%20Tailwind-61dafb?style=for-the-badge&logo=react)](README.md)
[![Express & Gemini API](https://img.shields.io/badge/Backend-Express%20%2B%20Gemini%202.5-4285f4?style=for-the-badge&logo=google)](README.md)

A complete, production-grade guide and interactive laboratory for building **Advanced Retrieval-Augmented Generation (RAG)** systems. This project bridges the gap between basic naive RAG (which suffers from low recall, keyword mismatch, and lost-in-the-middle context) and production-grade RAG architectures used by enterprise search engines.

---

## Table of Contents
1. [Why Naive RAG Fails & What Advanced RAG Solves](#why-naive-rag-fails--what-advanced-rag-solves)
2. [End-to-End System Architecture](#end-to-end-system-architecture)
3. [Mathematical & Algorithmic Foundations](#mathematical--algorithmic-foundations)
   - [Okapi BM25 (Sparse Lexical Search)](#1-okapi-bm25-sparse-lexical-search)
   - [Dense Vector Semantic Search & Cosine Similarity](#2-dense-vector-semantic-search)
   - [Reciprocal Rank Fusion (RRF)](#3-reciprocal-rank-fusion-rrf)
   - [Cross-Encoder Reranking vs Bi-Encoders](#4-cross-encoder-reranking-vs-bi-encoders)
   - [HyDE (Hypothetical Document Embeddings)](#5-hyde-hypothetical-document-embeddings)
4. [Step-by-Step Implementation Blueprint](#step-by-step-implementation-blueprint)
   - [Stage 1: Document Ingestion, Chunking & Metadata Enrichment](#stage-1-document-ingestion-chunking--metadata-enrichment)
   - [Stage 2: Building the BM25 Sparse Index](#stage-2-building-the-bm25-sparse-index)
   - [Stage 3: Dense Vector Embeddings & Vector Store](#stage-3-dense-vector-embeddings--vector-store)
   - [Stage 4: Dynamic Metadata Pre-Filtering](#stage-4-dynamic-metadata-pre-filtering)
   - [Stage 5: Hybrid Search & Rank Fusion](#stage-5-hybrid-search--rank-fusion)
   - [Stage 6: Cross-Encoder Reranker](#stage-6-cross-encoder-reranker)
   - [Stage 7: Query Rewriting Suite (HyDE, Multi-Query, Step-Back)](#stage-7-query-rewriting-suite)
   - [Stage 8: Grounded Answer Synthesis & Inline Citations](#stage-8-grounded-answer-synthesis--inline-citations)
5. [Retrieval Experiments & Evaluation Matrix](#retrieval-experiments--evaluation-matrix)
   - [Metrics: Hit Rate@K, MRR, NDCG@K, Precision@K](#evaluation-metrics)
6. [Interactive Workbench Features](#interactive-workbench-features)
7. [Production Tech Stack Recommendations](#production-tech-stack-recommendations)

---

## Why Naive RAG Fails & What Advanced RAG Solves

| Challenge in Naive RAG | Failure Mode | Advanced RAG Solution |
| :--- | :--- | :--- |
| **Exact Term & Code Mismatch** | Vector embeddings struggle with serial numbers, model IDs (`RTX-4090`), error codes (`ERR_404_TIMEOUT`), and rare domain acronyms. | **Hybrid Search**: Combines BM25 sparse keyword index with dense vectors. |
| **Semantic Drift & False Positives** | Top-K vector neighbors often match syntactic structure rather than actual informational answer. | **Cross-Encoder Reranking**: Full cross-attention between `(query, document)` scores true relevance. |
| **Query-Document Distribution Mismatch** | User questions are short, conversational, and underspecified, whereas knowledge passages are dense and descriptive. | **Query Rewriting (HyDE & Multi-Query)**: Generates hypothetical target passages or diverse perspectives. |
| **Out-of-Domain or Stale Context** | Retrieval pulls irrelevant documents from wrong years, tenants, or departments. | **Dynamic Metadata Pre-Filtering**: Scopes search space before or during vector traversal. |
| **No Visibility into Retrieval Quality** | Engineers deploy RAG blind without knowing which retrieval strategy actually works best on their data. | **A/B Retrieval Experiment Benchmark**: Computes MRR, Recall@K, and NDCG across strategies. |

---

## End-to-End System Architecture

```text
 ┌────────────────────────────────────────────────────────────────────────┐
 │                      INGESTION PIPELINE                                │
 └────────────────────────────────────────────────────────────────────────┘
  Raw Documents (PDF, MD, HTML, JSON)
         │
         ▼
  Chunking Engine (Recursive / Semantic Splitters, Token Windows + Overlap)
         │
         ├───► Metadata Enrichment (DocID, Section, Timestamp, Category, Tags)
         │
         ├───► Sparse Inverted Index (BM25: Term Frequencies, Doc Lengths, IDF)
         │
         └───► Dense Vector Embedding Model (text-embedding-004 / BGE / text-embedding-3)
               └──► Vector Database (Payloads + Index: HNSW / IVFFlat)

 ┌────────────────────────────────────────────────────────────────────────┐
 │                      RETRIEVAL & SERVING PIPELINE                      │
 └────────────────────────────────────────────────────────────────────────┘
  User Query
         │
         ▼
  Query Rewriter (HyDE / Multi-Query Expansion / Step-Back)
         │
         ▼
  Metadata Filter Parser (e.g., category == "cloud" && date >= 2024)
         │
    ┌────┴───────────────────────────┐
    ▼                                ▼
  Sparse BM25 Search             Dense Vector Search
  (Lexical Matches)              (Semantic Cosine Similarity)
    │                                │
    └────────────────► RRF ◄─────────┘
            Reciprocal Rank Fusion
                       │ Top-N Candidates (e.g., N = 25)
                       ▼
            Cross-Encoder Reranker
            (Pairwise Deep Relevance Scoring)
                       │ Top-K Final Passages (e.g., K = 5)
                       ▼
            Context Formatter & Citation Injector
                       │
                       ▼
            LLM Generation (Gemini 2.5 Flash)
                       │
                       ▼
            Grounded Answer with Source Attributions [Source 1, Source 2]
```

---

## Mathematical & Algorithmic Foundations

### 1. Okapi BM25 (Sparse Lexical Search)
BM25 calculates the relevance score of document $D$ for query $Q = \{q_1, q_2, \dots, q_n\}$:

$$\text{Score}_{\text{BM25}}(D, Q) = \sum_{i=1}^{n} \text{IDF}(q_i) \cdot \frac{f(q_i, D) \cdot (k_1 + 1)}{f(q_i, D) + k_1 \cdot \left(1 - b + b \cdot \frac{|D|}{\text{avgdl}}\right)}$$

Where:
- $f(q_i, D)$ is the frequency of query term $q_i$ in document $D$.
- $|D|$ is the length of document $D$ in words/tokens, and $\text{avgdl}$ is the average document length across the entire corpus.
- $k_1$ (typically $1.2 \dots 2.0$) controls **term frequency saturation**. Higher values mean more weight given to term repetition.
- $b$ (typically $0.75$) controls **document length normalization**. When $b = 1$, long documents are heavily penalized; when $b = 0$, length is ignored.
- $\text{IDF}(q_i) = \ln\left(\frac{N - n(q_i) + 0.5}{n(q_i) + 0.5} + 1\right)$ where $N$ is total docs and $n(q_i)$ is docs containing $q_i$.

---

### 2. Dense Vector Semantic Search
Dense embeddings project textual passages into an $M$-dimensional vector space (e.g., 768 or 1536 dimensions) where semantic similarity corresponds to geometric proximity:

$$\text{Cosine Similarity}(\vec{u}, \vec{v}) = \frac{\vec{u} \cdot \vec{v}}{\|\vec{u}\|_2 \|\vec{v}\|_2} = \frac{\sum_{i=1}^M u_i v_i}{\sqrt{\sum_{i=1}^M u_i^2} \sqrt{\sum_{i=1}^M v_i^2}}$$

Dense search captures synonyms (e.g., *"cost optimization"* matches *"lowering cloud spend"*) that BM25 misses.

---

### 3. Reciprocal Rank Fusion (RRF)
BM25 scores and vector cosine similarities live on completely different numerical scales (BM25 ranges from $0 \dots 50+$, cosine similarity ranges from $-1 \dots 1$). Standard score summation fails due to calibration mismatch.

**Reciprocal Rank Fusion** overcomes this by operating purely on the **rank positions** of items from each retrieval system:

$$\text{RRF\_Score}(d) = \sum_{m \in M} \frac{1}{k + r_m(d)}$$

Where:
- $M$ is the set of retrieval models (e.g., BM25 and Dense Vector).
- $r_m(d)$ is the 1-based rank position of document $d$ in the output of model $m$. If document $d$ is not in model $m$'s top results, $r_m(d) = \infty$ (i.e., contribution is 0).
- $k$ is a smoothing constant (standard default is $k = 60$). It prevents high-ranking outliers in one system from drowning out consistent consensus across both systems.

---

### 4. Cross-Encoder Reranking vs Bi-Encoders

- **Bi-Encoder (Retriever)**: Encodes `Query` and `Document` into separate vectors independently: $\vec{q} = f(Q)$, $\vec{d} = f(D)$. Extremely fast for indexing millions of documents via approximate nearest neighbors (ANN), but suffers from information loss because query and document tokens never interact.
- **Cross-Encoder (Reranker)**: Feeds `[CLS] Query [SEP] Document [SEP]` simultaneously into all transformer layers. Every token in the query attends to every token in the document via full multi-head self-attention.
- **Strategy**: Retrieve a broad candidate pool (e.g., top 30-50) using Hybrid Search in $< 15\text{ms}$, then use a Cross-Encoder to accurately score and reorder the top 5-10 for the LLM.

---

### 5. HyDE (Hypothetical Document Embeddings)
- **Problem**: Queries are often short questions ("*How does raft handle split brain?*"), while candidate documents are factual explanations ("*In the Raft consensus algorithm, split-brain is prevented by requiring a strict majority vote...*"). Because question syntax differs from answer syntax, embedding distances can be deceptively high.
- **HyDE Solution**:
  1. Prompt an instruction-tuned LLM to generate a hypothetical answer passage.
  2. Embed this hypothetical document $\vec{v}_{\text{hypo}}$.
  3. Search the vector database using $\vec{v}_{\text{hypo}}$ instead of $\vec{v}_{\text{query}}$.
  4. The hypothetical answer acts as an ungrounded hallucination that points precisely to the correct neighborhood in document embedding space!

---

## Step-by-Step Implementation Blueprint

### Stage 1: Document Ingestion, Chunking & Metadata Enrichment

```python
# python/chunker.py
from dataclasses import dataclass
from typing import List, Dict, Any
import re

@dataclass
class Chunk:
    id: str
    doc_id: str
    text: str
    token_count: int
    chunk_index: int
    metadata: Dict[str, Any]

def recursive_token_chunker(
    text: str, 
    doc_id: str, 
    metadata: Dict[str, Any], 
    chunk_size: int = 350, 
    chunk_overlap: int = 50
) -> List[Chunk]:
    # Split on semantic markdown headers, paragraphs, or sentences
    paragraphs = re.split(r'\n{2,}', text)
    chunks = []
    current_tokens = []
    chunk_idx = 0

    for para in paragraphs:
        para_tokens = para.strip().split()
        if not para_tokens:
            continue
            
        if len(current_tokens) + len(para_tokens) <= chunk_size:
            current_tokens.extend(para_tokens)
        else:
            if current_tokens:
                chunk_text = " ".join(current_tokens)
                chunks.append(Chunk(
                    id=f"{doc_id}_c{chunk_idx}",
                    doc_id=doc_id,
                    text=chunk_text,
                    token_count=len(current_tokens),
                    chunk_index=chunk_idx,
                    metadata=metadata.copy()
                ))
                chunk_idx += 1
                # Sliding window overlap
                current_tokens = current_tokens[-chunk_overlap:] + para_tokens
            else:
                current_tokens = para_tokens

    if current_tokens:
        chunks.append(Chunk(
            id=f"{doc_id}_c{chunk_idx}",
            doc_id=doc_id,
            text=" ".join(current_tokens),
            token_count=len(current_tokens),
            chunk_index=chunk_idx,
            metadata=metadata.copy()
        ))

    return chunks
```

---

### Stage 2: Building the BM25 Sparse Index

```python
# python/bm25_index.py
import math
from collections import Counter
from typing import List, Dict
from chunker import Chunk

class BM25Index:
    def __init__(self, k1: float = 1.5, b: float = 0.75):
        self.k1 = k1
        self.b = b
        self.chunks: List[Chunk] = []
        self.doc_lengths: List[int] = []
        self.avg_doc_len: float = 0.0
        self.inverted_index: Dict[str, List[tuple]] = {} # term -> [(chunk_idx, tf)]
        self.idf: Dict[str, float] = {}

    def tokenize(self, text: str) -> List[str]:
        return [w.lower() for w in text.split() if len(w) > 1]

    def fit(self, chunks: List[Chunk]):
        self.chunks = chunks
        N = len(chunks)
        self.doc_lengths = [len(self.tokenize(c.text)) for c in chunks]
        self.avg_doc_len = sum(self.doc_lengths) / max(1, N)
        df = Counter()

        for idx, chunk in enumerate(chunks):
            tokens = self.tokenize(chunk.text)
            term_freqs = Counter(tokens)
            for term, count in term_freqs.items():
                if term not in self.inverted_index:
                    self.inverted_index[term] = []
                self.inverted_index[term].append((idx, count))
                df[term] += 1

        for term, freq in df.items():
            self.idf[term] = math.log((N - freq + 0.5) / (freq + 0.5) + 1.0)

    def search(self, query: str, top_k: int = 20) -> List[tuple]:
        query_terms = self.tokenize(query)
        scores = [0.0] * len(self.chunks)

        for term in query_terms:
            if term not in self.inverted_index:
                continue
            idf = self.idf[term]
            for doc_idx, tf in self.inverted_index[term]:
                dl = self.doc_lengths[doc_idx]
                numerator = tf * (self.k1 + 1)
                denominator = tf + self.k1 * (1 - self.b + self.b * (dl / self.avg_doc_len))
                scores[doc_idx] += idf * (numerator / denominator)

        ranked = sorted(enumerate(scores), key=lambda x: x[1], reverse=True)
        return [(self.chunks[idx], score) for idx, score in ranked[:top_k] if score > 0]
```

---

### Stage 3: Dense Vector Embeddings & Vector Store

```python
# python/dense_retriever.py
from google import genai
import numpy as np

ai = genai.Client()

def get_embedding(text: str) -> List[float]:
    response = ai.models.embed_content(
        model="text-embedding-004",
        contents=text
    )
    return response.embedding.values

def cosine_similarity(v1: List[float], v2: List[float]) -> float:
    a, b = np.array(v1), np.array(v2)
    return float(np.dot(a, b) / (np.linalg.norm(a) * np.linalg.norm(b)))
```

---

### Stage 4: Dynamic Metadata Pre-Filtering

Before calculating scores or running vector searches, prune documents that do not satisfy metadata constraints:

```typescript
// typescript/metadataFilter.ts
export interface MetadataCriteria {
  category?: string;
  tags?: string[];
  minYear?: number;
  maxYear?: number;
  source?: string;
}

export function filterChunks(chunks: Chunk[], criteria: MetadataCriteria): Chunk[] {
  return chunks.filter(c => {
    if (criteria.category && c.metadata.category !== criteria.category) return false;
    if (criteria.source && c.metadata.source !== criteria.source) return false;
    if (criteria.minYear && c.metadata.year < criteria.minYear) return false;
    if (criteria.maxYear && c.metadata.year > criteria.maxYear) return false;
    if (criteria.tags && criteria.tags.length > 0) {
      const chunkTags = new Set(c.metadata.tags || []);
      const hasMatch = criteria.tags.some(tag => chunkTags.has(tag));
      if (!hasMatch) return false;
    }
    return true;
  });
}
```

---

### Stage 5: Hybrid Search & Reciprocal Rank Fusion (RRF)

```python
# python/hybrid_fusion.py
from typing import List, Dict

def reciprocal_rank_fusion(
    dense_results: List[Chunk], 
    sparse_results: List[Chunk], 
    k: int = 60,
    top_n: int = 15
) -> List[dict]:
    rrf_scores: Dict[str, float] = {}
    chunk_map: Dict[str, Chunk] = {}
    dense_ranks: Dict[str, int] = {}
    sparse_ranks: Dict[str, int] = {}

    for rank, chunk in enumerate(dense_results, start=1):
        chunk_map[chunk.id] = chunk
        dense_ranks[chunk.id] = rank
        rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (k + rank))

    for rank, chunk in enumerate(sparse_results, start=1):
        chunk_map[chunk.id] = chunk
        sparse_ranks[chunk.id] = rank
        rrf_scores[chunk.id] = rrf_scores.get(chunk.id, 0.0) + (1.0 / (k + rank))

    sorted_ids = sorted(rrf_scores.keys(), key=lambda cid: rrf_scores[cid], reverse=True)
    
    return [
        {
            "chunk": chunk_map[cid],
            "rrf_score": rrf_scores[cid],
            "dense_rank": dense_ranks.get(cid, None),
            "sparse_rank": sparse_ranks.get(cid, None)
        }
        for cid in sorted_ids[:top_n]
    ]
```

---

### Stage 6: Cross-Encoder Reranker

```python
# python/reranker.py
from sentence_transformers import CrossEncoder

reranker = CrossEncoder('cross-encoder/ms-marco-MiniLM-L-6-v2')

def rerank_passages(query: str, candidate_chunks: List[Chunk], top_k: int = 5):
    pairs = [[query, chunk.text] for chunk in candidate_chunks]
    scores = reranker.predict(pairs)
    
    ranked_indices = scores.argsort()[::-1]
    return [
        {
            "chunk": candidate_chunks[idx],
            "rerank_score": float(scores[idx]),
            "original_rank": idx + 1
        }
        for idx in ranked_indices[:top_k]
    ]
```

---

### Stage 7: Query Rewriting Suite

```typescript
// Query rewriting methods:
// 1. HyDE: Prompt LLM for hallucinated target answer passage, embed that passage.
// 2. Multi-Query: Generate 3 query variants, perform 3 retrievers, deduplicate results.
// 3. Step-Back Prompting: Derive high-level conceptual questions.
// 4. Sub-Question Decomposition: Split multi-hop logic into atomic questions.
```

---

## Retrieval Experiments & Evaluation Matrix

To know if your Advanced RAG system actually improves search accuracy, benchmark it with standard Information Retrieval (IR) metrics:

### Evaluation Metrics
1. **Hit Rate @ K (Recall @ K)**:
   $$\text{HitRate@K} = \frac{1}{|Q|} \sum_{q \in Q} \mathbb{I}(\text{at least one ground truth chunk in top K})$$
2. **Mean Reciprocal Rank (MRR)**:
   $$\text{MRR} = \frac{1}{|Q|} \sum_{q \in Q} \frac{1}{\text{rank}(q)}$$
   Where $\text{rank}(q)$ is the position of the first relevant chunk found.
3. **Normalized Discounted Cumulative Gain (NDCG@K)**:
   Measures both presence and position of relevant documents, giving higher penalties when relevant chunks appear lower down.
4. **Latency (ms)**:
   Retrieval execution time across sparse, dense, hybrid, and reranking stages.

---

## Interactive Workbench Features

This applet provides an interactive, live workbench for experimenting with every phase of the pipeline:

- **Interactive Pipeline Flow**: Click any stage in the interactive flowchart to inspect its mathematical equations, parameter sliders, and live state.
- **Side-by-Side Strategy Comparison**: Test any query simultaneously across:
  1. *Sparse Only (BM25)*
  2. *Dense Vector (Cosine)*
  3. *Hybrid (RRF)*
  4. *Advanced Hybrid + Dynamic Metadata Filter + Cross-Encoder Rerank*
- **Rank Shift Visualizer**: Inspect how chunks change rank positions from initial hybrid retrieval to cross-encoder reranking.
- **Dynamic Corpus Loader**: Switch between pre-loaded enterprise corpora (AI Systems, Cloud Distributed Architectures, Financial Risk) or upload your own markdown/text files.
- **Evaluation Benchmark Suite**: Run automated test query suites with ground truth labels to compute MRR, Hit Rate@K, NDCG@K, and Latency.
- **Live Grounded Synthesis**: Generate answers with inline bracket citations `[Source 1]` tied directly to chunk excerpts.

---

## Production Tech Stack Recommendations

| Component | Prototyping / Open-Source | Managed / Enterprise Cloud |
| :--- | :--- | :--- |
| **Vector Database** | Qdrant, Chroma, pgvector (PostgreSQL) | Pinecone, Google Cloud Vertex AI Vector Search, Milvus |
| **Sparse BM25** | `rank_bm25`, FastBM25, Tantivy | Elasticsearch, OpenSearch, Azure AI Search |
| **Rerankers** | `FlashRank` (ultra-fast CPU), `ms-marco-MiniLM` | Cohere Rerank API, BAAI/bge-reranker-large |
| **Embedding Models** | `BAAI/bge-large-en-v1.5`, `nomic-embed-text` | Google `text-embedding-004`, OpenAI `text-embedding-3-large` |
| **LLM Generation** | Llama-3.3-70B, Qwen-2.5 | Gemini 2.5 Flash, Claude 3.5 Sonnet, GPT-4o |
| **Evaluation Frameworks** | Ragas, TruLens, DeepEval | Arize Phoenix, Langfuse, Galileo |
