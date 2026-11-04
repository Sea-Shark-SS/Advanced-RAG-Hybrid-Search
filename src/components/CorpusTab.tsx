import React, { useState } from 'react';
import { 
  Database, 
  FileText, 
  Plus, 
  Search, 
  Layers, 
  Tag, 
  Calendar, 
  User, 
  Sliders, 
  Hash,
  ExternalLink,
  Trash2
} from 'lucide-react';
import { DocumentItem, Chunk, PipelineSettings } from '../types/rag';

interface CorpusTabProps {
  documents: DocumentItem[];
  chunks: Chunk[];
  settings: PipelineSettings;
  setSettings: React.Dispatch<React.SetStateAction<PipelineSettings>>;
  onAddDocument: (doc: DocumentItem) => void;
  onDeleteDocument: (docId: string) => void;
}

export const CorpusTab: React.FC<CorpusTabProps> = ({
  documents,
  chunks,
  settings,
  setSettings,
  onAddDocument,
  onDeleteDocument,
}) => {
  const [filterText, setFilterText] = useState('');
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [showAddDocModal, setShowAddDocModal] = useState(false);

  // New doc form state
  const [newTitle, setNewTitle] = useState('');
  const [newCategory, setNewCategory] = useState('Engineering');
  const [newAuthor, setNewAuthor] = useState('');
  const [newYear, setNewYear] = useState(2024);
  const [newTags, setNewTags] = useState('');
  const [newContent, setNewContent] = useState('');

  const filteredChunks = chunks.filter((c) => {
    if (selectedDocId && c.docId !== selectedDocId) return false;
    if (
      filterText &&
      !c.text.toLowerCase().includes(filterText.toLowerCase()) &&
      !c.metadata.title.toLowerCase().includes(filterText.toLowerCase())
    ) {
      return false;
    }
    return true;
  });

  const handleCreateDocument = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newContent.trim()) return;

    const newDoc: DocumentItem = {
      id: `custom_doc_${Date.now()}`,
      title: newTitle.trim(),
      category: newCategory.trim() || 'General',
      author: newAuthor.trim() || 'Anonymous',
      year: Number(newYear) || 2024,
      source: 'Custom Upload',
      tags: newTags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean),
      content: newContent.trim(),
    };

    onAddDocument(newDoc);
    setNewTitle('');
    setNewAuthor('');
    setNewTags('');
    setNewContent('');
    setShowAddDocModal(false);
  };

  return (
    <div className="space-y-6">
      {/* Overview & Ingestion Controls */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Database className="w-5 h-5 text-cyan-400" />
            <h2 className="text-base font-bold text-white tracking-tight">
              Knowledge Corpus & Chunk Boundary Inspector
            </h2>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Inspect raw text passages broken into overlapping chunk windows. Adjust sliding-window parameters or upload custom documents to dynamically re-index the sparse and dense representations.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setShowAddDocModal(true)}
            className="flex items-center gap-1.5 bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs shadow-lg shadow-cyan-500/20"
          >
            <Plus className="w-4 h-4" />
            <span>Upload New Document</span>
          </button>
        </div>
      </div>

      {/* Chunking Configuration Bar */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-5 grid grid-cols-1 md:grid-cols-3 gap-6">
        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Chunk Window Size</span>
            <span className="font-mono text-cyan-400 font-bold">{settings.chunkSize} words/tokens</span>
          </div>
          <input
            type="range"
            min="100"
            max="600"
            step="25"
            value={settings.chunkSize}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, chunkSize: Number(e.target.value) }))
            }
            className="w-full accent-cyan-500"
          />
        </div>

        <div>
          <div className="flex justify-between text-xs mb-1.5">
            <span className="font-semibold text-slate-300">Window Overlap</span>
            <span className="font-mono text-indigo-400 font-bold">{settings.chunkOverlap} tokens</span>
          </div>
          <input
            type="range"
            min="0"
            max="150"
            step="10"
            value={settings.chunkOverlap}
            onChange={(e) =>
              setSettings((prev) => ({ ...prev, chunkOverlap: Number(e.target.value) }))
            }
            className="w-full accent-indigo-500"
          />
        </div>

        <div className="flex items-center justify-around border-t md:border-t-0 md:border-l border-slate-800 pt-3 md:pt-0">
          <div className="text-center">
            <span className="block text-xs text-slate-400">Total Chunks</span>
            <span className="text-base font-bold text-white font-mono">{chunks.length}</span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-slate-400">Documents</span>
            <span className="text-base font-bold text-white font-mono">{documents.length}</span>
          </div>
          <div className="text-center">
            <span className="block text-xs text-slate-400">Avg Tokens/Chunk</span>
            <span className="text-base font-bold text-cyan-400 font-mono">
              {chunks.length > 0
                ? Math.round(chunks.reduce((acc, c) => acc + c.tokenCount, 0) / chunks.length)
                : 0}
            </span>
          </div>
        </div>
      </div>

      {/* Main Split View: Documents List on Left, Chunks Inspector on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Document List */}
        <div className="lg:col-span-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Source Documents ({documents.length})
            </h3>
            {selectedDocId && (
              <button
                onClick={() => setSelectedDocId(null)}
                className="text-xs text-cyan-400 hover:underline"
              >
                Clear selection
              </button>
            )}
          </div>

          <div className="space-y-2">
            {documents.map((doc) => {
              const isSelected = selectedDocId === doc.id;
              const docChunks = chunks.filter((c) => c.docId === doc.id);
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDocId(isSelected ? null : doc.id)}
                  className={`p-3.5 rounded-xl border text-xs cursor-pointer transition-all ${
                    isSelected
                      ? 'bg-cyan-950/40 border-cyan-500 shadow-md ring-1 ring-cyan-500/20'
                      : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium text-[10px]">
                      {doc.category}
                    </span>
                    <span className="text-slate-500 font-mono text-[11px]">
                      {docChunks.length} chunks
                    </span>
                  </div>
                  <h4 className="font-bold text-slate-100 text-xs mb-1.5">{doc.title}</h4>
                  <div className="flex items-center gap-2 text-[11px] text-slate-400">
                    <span>{doc.author}</span>
                    <span>•</span>
                    <span>{doc.year}</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right: Chunks Stream */}
        <div className="lg:col-span-8 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={filterText}
                onChange={(e) => setFilterText(e.target.value)}
                placeholder="Filter chunks by text or keywords..."
                className="w-full bg-slate-900 border border-slate-700 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-cyan-500"
              />
            </div>
            <span className="text-xs text-slate-400 whitespace-nowrap">
              Showing {filteredChunks.length} of {chunks.length}
            </span>
          </div>

          <div className="space-y-3 max-h-[700px] overflow-y-auto pr-1">
            {filteredChunks.map((chunk) => (
              <div
                key={chunk.id}
                className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 text-xs space-y-2 hover:border-slate-700 transition-colors"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/80 pb-2">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-cyan-400 bg-cyan-950/80 px-2 py-0.5 rounded border border-cyan-800 text-[11px]">
                      {chunk.id}
                    </span>
                    <span className="font-semibold text-slate-200 truncate max-w-sm">
                      {chunk.metadata.title}
                    </span>
                  </div>
                  <div className="flex items-center gap-3 text-slate-400 text-[11px]">
                    <span className="flex items-center gap-1">
                      <Hash className="w-3 h-3 text-slate-500" />
                      Chunk #{chunk.chunkIndex}
                    </span>
                    <span>{chunk.tokenCount} tokens</span>
                  </div>
                </div>

                <p className="text-slate-300 leading-relaxed font-sans bg-slate-950/60 p-3 rounded-lg border border-slate-800/60">
                  {chunk.text}
                </p>

                <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-[11px]">
                  <span className="text-slate-500">
                    Source: {chunk.metadata.source} ({chunk.metadata.year})
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {chunk.metadata.tags.map((t) => (
                      <span
                        key={t}
                        className="bg-slate-800 text-slate-400 text-[10px] px-2 py-0.2 rounded-full"
                      >
                        #{t}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Add Document Modal */}
      {showAddDocModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl max-w-2xl w-full p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Plus className="w-4 h-4 text-cyan-400" />
                <span>Upload Custom Document to Knowledge Base</span>
              </h3>
              <button
                onClick={() => setShowAddDocModal(false)}
                className="text-slate-400 hover:text-white text-xs font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateDocument} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Document Title
                </label>
                <input
                  type="text"
                  required
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="e.g. High-Availability PostgreSQL Replication Strategies"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Category
                  </label>
                  <input
                    type="text"
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value)}
                    placeholder="e.g. Databases"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Author
                  </label>
                  <input
                    type="text"
                    value={newAuthor}
                    onChange={(e) => setNewAuthor(e.target.value)}
                    placeholder="e.g. Jane Doe"
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-300 mb-1">
                    Publication Year
                  </label>
                  <input
                    type="number"
                    value={newYear}
                    onChange={(e) => setNewYear(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Topic Tags (comma-separated)
                </label>
                <input
                  type="text"
                  value={newTags}
                  onChange={(e) => setNewTags(e.target.value)}
                  placeholder="e.g. postgres, replication, failover, wal"
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-300 mb-1">
                  Document Content / Text
                </label>
                <textarea
                  required
                  rows={8}
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder="Paste multi-paragraph markdown or raw technical text here..."
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono text-xs"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowAddDocModal(false)}
                  className="px-4 py-2 rounded-lg font-semibold text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newTitle.trim() || !newContent.trim()}
                  className="bg-cyan-500 hover:bg-cyan-400 disabled:opacity-50 text-slate-950 font-bold px-4 py-2 rounded-lg"
                >
                  Add & Index Document
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
