import { useEffect, useState, useRef } from 'react';
import { Trash2, MessageSquare, FileText, Upload, Layers } from 'lucide-react';
import { listDocuments, deleteDocument, uploadFiles } from '../services/api.js';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function DocCard({ doc, isActive, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e) {
    e.stopPropagation();
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    const ok = await onDelete(doc.id);
    if (!ok) setDeleting(false);
    setConfirming(false);
  }

  function handleCancel(e) {
    e.stopPropagation();
    setConfirming(false);
  }

  const isIndexed = doc.status === 'INDEXED';
  const sizePart = doc.fileSize ? formatSize(doc.fileSize) : null;
  const pagesPart = doc.totalPages != null ? `${doc.totalPages}p` : null;
  const metaParts = [sizePart, pagesPart].filter(Boolean);

  return (
    <div
      className={`doc-card${isActive ? ' doc-card--active' : ''}`}
      onClick={() => !confirming && onSelect(doc.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !confirming && onSelect(doc.id)}
      title={doc.errorMessage ?? doc.filename}
    >
      <FileText size={16} strokeWidth={1.5} className="doc-card__icon" />

      <div className="doc-card__body">
        {/* §3.1 DTO uses `filename` (lowercase n) */}
        <div className="doc-card__name">{doc.filename}</div>
        {metaParts.length > 0 && (
          <div className="doc-card__meta">{metaParts.join(' · ')}</div>
        )}
        <div className={`doc-card__status doc-card__status--${isIndexed ? 'indexed' : 'other'}`}>
          <span className={`status-dot status-dot--${isIndexed ? 'indexed' : 'other'}`} />
          {isIndexed ? 'Indexed' : doc.status.toLowerCase()}
          {doc.totalChunks != null && (
            <span style={{ display: 'flex', alignItems: 'center', gap: 3, marginLeft: 6, color: 'var(--text-faint)', fontWeight: 400 }}>
              <Layers size={10} strokeWidth={1.5} />
              {doc.totalChunks} chunks
            </span>
          )}
        </div>
      </div>

      <div className="doc-card__actions">
        {confirming ? (
          <div className="doc-card__confirm" onClick={(e) => e.stopPropagation()}>
            <span className="doc-card__confirm-label">Delete?</span>
            <button className="btn-text" onClick={handleDelete} disabled={deleting}>
              {deleting ? '…' : 'Delete'}
            </button>
            <button className="btn-text" onClick={handleCancel}>Cancel</button>
          </div>
        ) : (
          <button className="btn-icon" title="Delete document" onClick={handleDelete}>
            <Trash2 size={14} strokeWidth={1.5} />
          </button>
        )}
      </div>
    </div>
  );
}

export default function Sidebar({
  documents,
  setDocuments,
  selectedDocId,
  onSelect,
  onDelete,
  toast,
}) {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    async function load() {
      const { data, error } = await listDocuments();
      if (error) toast(error, 'error');
      else setDocuments(data);
      setLoading(false);
    }
    load();
  }, [setDocuments, toast]);

  async function handleDelete(id) {
    const { error } = await deleteDocument(id);
    if (error) { toast(error, 'error'); return false; }
    onDelete(id);
    toast('Document deleted.', 'success');
    return true;
  }

  async function handleUploadFiles(files) {
    if (!files.length) return;
    const { data, error } = await uploadFiles(Array.from(files), null);
    if (error) { toast(`Upload failed: ${error}`, 'error'); return; }
    const results = Array.isArray(data) ? data : [data];
    const newDocs = results
      .filter((r) => r && r.status !== 'FAILED')
      .map((r) => ({
        id: r.id,
        filename: r.fileName,  // upload DTO uses fileName (capital N); normalize to filename
        fileSize: r.fileSize,
        totalPages: null,
        totalChunks: r.chunksCreated,
        status: r.status,
        errorMessage: null,
        contentType: 'application/pdf',
      }));
    if (newDocs.length) {
      setDocuments((prev) => [...newDocs, ...prev]);
      toast(`${newDocs.length} file${newDocs.length > 1 ? 's' : ''} uploaded.`, 'success');
    }
    results.filter((r) => r?.status === 'FAILED').forEach((r) => {
      toast(`${r.fileName} failed to process.`, 'error');
    });
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    handleUploadFiles(e.dataTransfer.files);
  }

  const filtered = filter.trim()
    ? documents.filter((d) => d.filename.toLowerCase().includes(filter.toLowerCase()))
    : documents;

  return (
    <aside className="sidebar">
      <div className="sidebar__header">
        <div className="sidebar__heading">
          <span className="sidebar__title">Knowledge Base</span>
          <span className="sidebar__subtitle">Indexed vector documents</span>
        </div>
        {/* Placeholder chat-history icon — no behavior in v1 */}
        <button className="btn-icon" title="Chat history (coming soon)" disabled>
          <MessageSquare size={16} strokeWidth={1.5} />
        </button>
      </div>

      <div className="sidebar__list">
        {/* Inline upload dropzone */}
        <div
          className={`sidebar-dropzone${dragOver ? ' sidebar-dropzone--over' : ''}`}
          onClick={() => fileInputRef.current?.click()}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && fileInputRef.current?.click()}
        >
          <Upload size={16} strokeWidth={1.5} color="var(--accent)" />
          <div className="sidebar-dropzone__text">
            <span className="sidebar-dropzone__action">Upload document or drag here</span>
            <span className="sidebar-dropzone__hint">PDF, Word, Markdown, TXT, CSV (max 25MB)</span>
          </div>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          style={{ display: 'none' }}
          onChange={(e) => handleUploadFiles(e.target.files)}
        />

        <div className="sidebar-divider" />

        {loading ? (
          <p className="sidebar__empty">Loading…</p>
        ) : (
          <>
            {/* All Documents card */}
            <div
              className={`all-docs-card${!selectedDocId ? ' all-docs-card--active' : ''}`}
              onClick={() => onSelect(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(null)}
            >
              <div className="all-docs-card__top">
                <span className="all-docs-card__title">All Documents</span>
                <span className="all-docs-card__count">{documents.length}</span>
              </div>
              <div className="all-docs-card__sub">Search across complete corpus</div>
            </div>

            {/* Filter */}
            <input
              className="sidebar-filter"
              placeholder="Filter files…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />

            <div className="sidebar-divider" />

            {/* Document cards list */}
            <div className="sidebar-docs-list">
              {documents.length === 0 ? (
                <p className="sidebar__empty">No documents yet.</p>
              ) : filtered.length === 0 ? (
                <p className="sidebar__empty">No documents match "{filter}".</p>
              ) : (
                filtered.map((doc) => (
                  <DocCard
                    key={doc.id}
                    doc={doc}
                    isActive={selectedDocId === doc.id}
                    onSelect={onSelect}
                    onDelete={handleDelete}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
}
