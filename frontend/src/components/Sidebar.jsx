import { useEffect, useState } from 'react';
import { Trash2, MessageSquare, FileText, Upload, ChevronDown, ChevronUp, X } from 'lucide-react';
import { listDocuments, deleteDocument } from '../services/api.js';
import '../styles/Sidebar.css';

function formatSize(bytes) {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  if (!iso) return '—';
  try {
    const d = new Date(iso);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  } catch {
    return '—';
  }
}

function DocCard({ doc, isActive, onSelect, onDelete }) {
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [expanded, setExpanded] = useState(false);

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

  function handleToggleExpand(e) {
    e.stopPropagation();
    setExpanded((prev) => !prev);
  }

  const isIndexed = doc.status === 'INDEXED';
  const sizePart = doc.fileSize ? formatSize(doc.fileSize) : null;
  const chunksCount = doc.totalChunks != null ? doc.totalChunks : '—';
  const pagesCount = doc.totalPages != null ? doc.totalPages : '—';
  const dateFormatted = formatDate(doc.createdAt);

  return (
    <div
      className={`doc-card${isActive ? ' doc-card--active' : ''}`}
      onClick={() => !confirming && onSelect(doc.id)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && !confirming && onSelect(doc.id)}
      title={doc.errorMessage ?? doc.filename}
    >
      {/* Top row: icon, name, expand chevron, delete */}
      <div className="doc-card__top-row">
        <div className="doc-card__icon-box">
          <FileText size={16} strokeWidth={1.5} className="doc-card__icon" />
        </div>

        <div className="doc-card__name" title={doc.filename}>
          {doc.filename}
        </div>

        <div className="doc-card__actions">
          <button
            type="button"
            className="btn-icon doc-card__expand-btn"
            title={expanded ? 'Hide details' : 'Show details'}
            aria-label={expanded ? 'Hide document stats' : 'Show document stats'}
            onClick={handleToggleExpand}
          >
            {expanded ? <ChevronUp size={15} strokeWidth={1.75} /> : <ChevronDown size={15} strokeWidth={1.75} />}
          </button>

          {confirming ? (
            <div className="doc-card__confirm" onClick={(e) => e.stopPropagation()}>
              <span className="doc-card__confirm-label">Delete?</span>
              <button className="btn-text" onClick={handleDelete} disabled={deleting}>
                {deleting ? '…' : 'Delete'}
              </button>
              <button className="btn-text" onClick={handleCancel}>Cancel</button>
            </div>
          ) : (
            <button
              type="button"
              className="btn-icon doc-card__delete-btn"
              title="Delete document"
              aria-label="Delete document"
              onClick={handleDelete}
            >
              <Trash2 size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      {/* Second row: status badge + size */}
      <div className="doc-card__sub-row">
        <div className={`doc-card__status doc-card__status--${isIndexed ? 'indexed' : 'other'}`}>
          <span className={`status-dot status-dot--${isIndexed ? 'indexed' : 'other'}`} />
          {isIndexed ? 'Indexed' : (doc.status ?? '').toLowerCase()}
        </div>
        {sizePart && <span className="doc-card__size">{sizePart}</span>}
      </div>

      {/* Expandable stat boxes (Fix 9 - Raman request 3) */}
      {expanded && (
        <div className="doc-card__stats-grid">
          <div className="doc-stat-box">
            <span className="doc-stat-box__val doc-stat-box__val--chunks">{chunksCount}</span>
            <span className="doc-stat-box__lbl">chunks</span>
          </div>
          <div className="doc-stat-box">
            <span className="doc-stat-box__val">{pagesCount}</span>
            <span className="doc-stat-box__lbl">pages</span>
          </div>
          <div className="doc-stat-box">
            <span className="doc-stat-box__val">{dateFormatted}</span>
            <span className="doc-stat-box__lbl">added</span>
          </div>
        </div>
      )}
    </div>
  );
}

export default function Sidebar({
  documents,
  setDocuments,
  selectedDocId,
  onSelect,
  onDelete,
  isOpen = true,
  onClose,
  onUploadOpen,
  toast,
  conversations = [],
  activeConversationId = null,
  onSelectConversation,
  onOpenChat,
  onFetchConversations,
  isStreaming = false,
}) {
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showChats, setShowChats] = useState(false);

  useEffect(() => {
    async function load() {
      const { data, error } = await listDocuments();
      if (error) toast(error, 'error');
      else setDocuments(data);
      setLoading(false);
    }
    load();
  }, [setDocuments, toast]);

  function handleToggleChats() {
    setShowChats((prev) => {
      const next = !prev;
      if (next) {
        onFetchConversations?.();
        onOpenChat?.();
      }
      return next;
    });
  }

  async function handleDelete(id) {
    const { error } = await deleteDocument(id);
    if (error) { toast(error, 'error'); return false; }
    onDelete(id);
    toast('Document deleted.', 'success');
    return true;
  }

  // Fix 12: Dragging files onto sidebar dropzone opens UploadDialog with staged files
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    if (e.dataTransfer.files?.length) {
      onUploadOpen?.(e.dataTransfer.files);
    }
  }

  // Fix 13: filter OUT documents with status FAILED from sidebar list and count
  const visibleDocs = documents.filter((d) => d.status !== 'FAILED');

  // Null-safe filter (Fix 6 item 4 - P2-13)
  const filtered = filter.trim()
    ? visibleDocs.filter((d) => (d.filename ?? '').toLowerCase().includes(filter.toLowerCase()))
    : visibleDocs;

  return (
    <aside className={`sidebar${!isOpen ? ' sidebar--collapsed' : ''}`} aria-hidden={!isOpen}>
      <div className="sidebar__header">
        <div className="sidebar__heading">
          <span className="sidebar__title">Knowledge Base</span>
          <span className="sidebar__subtitle">Indexed vector documents</span>
        </div>
        <div className="sidebar__header-actions">
          <button
            type="button"
            className={`btn-icon sidebar__chat-btn${showChats ? ' sidebar__chat-btn--active' : ''}`}
            title={showChats ? 'Hide chat history' : 'Show chat history'}
            aria-label={showChats ? 'Hide chat history' : 'Show chat history'}
            onClick={handleToggleChats}
          >
            <MessageSquare size={16} strokeWidth={1.5} />
          </button>
          {/* Close sidebar control (Fix 11 - Raman request 5) */}
          {onClose && (
            <button
              type="button"
              className="btn-icon sidebar__close-btn"
              title="Close sidebar"
              aria-label="Close sidebar"
              onClick={onClose}
            >
              <X size={16} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>

      <div className="sidebar__list">
        {/* Chats section (hidden by default, toggled via chat button next to Knowledge Base) */}
        {showChats && (
          <div className="sidebar-section sidebar-section--chats">
            <div className="sidebar-section__header">
              <span className="sidebar-section__title">Chats</span>
            </div>

            {conversations.length > 0 && (
              <div className="sidebar-chats-list">
                {conversations.map((conv) => (
                  <button
                    key={conv.conversationId}
                    type="button"
                    className={`sidebar-chat-row${activeConversationId === conv.conversationId ? ' sidebar-chat-row--active' : ''}`}
                    onClick={() => onSelectConversation(conv.conversationId)}
                    disabled={isStreaming}
                    title={conv.title}
                  >
                    <MessageSquare size={14} strokeWidth={1.5} className="sidebar-chat-row__icon" />
                    <span className="sidebar-chat-row__title">{conv.title}</span>
                  </button>
                ))}
              </div>
            )}

            <div className="sidebar-divider" />
          </div>
        )}

        {/* Inline upload dropzone (Fix 12: click opens UploadDialog) */}
        <div
          className={`sidebar-dropzone${dragOver ? ' sidebar-dropzone--over' : ''}`}
          onClick={() => onUploadOpen?.([])}
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && onUploadOpen?.([])}
        >
          <Upload size={16} strokeWidth={1.5} color="var(--accent)" />
          <div className="sidebar-dropzone__text">
            <span className="sidebar-dropzone__action">Upload document or drag here</span>
            <span className="sidebar-dropzone__hint">PDF, Word, Markdown, TXT, CSV (max 25MB)</span>
          </div>
        </div>

        <div className="sidebar-divider" />

        {loading ? (
          <p className="sidebar__empty">Loading…</p>
        ) : (
          <>
            {/* All Documents card (Fix 13: reflects visibleDocs count) */}
            <div
              className={`all-docs-card${!selectedDocId ? ' all-docs-card--active' : ''}`}
              onClick={() => onSelect(null)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && onSelect(null)}
            >
              <div className="all-docs-card__top">
                <span className="all-docs-card__title">All Documents</span>
                <span className="all-docs-card__count">{visibleDocs.length}</span>
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
              {visibleDocs.length === 0 ? (
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
