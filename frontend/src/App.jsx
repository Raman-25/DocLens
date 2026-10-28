import { useState, useRef, useEffect } from 'react';
import { Sparkles, RotateCcw, Sun, Moon } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastContainer, useToast } from './components/Toast.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import SearchPanel from './components/search/SearchPanel.jsx';
import ChunksPanel from './components/search/ChunksPanel.jsx';
import UploadDialog from './components/documents/UploadDialog.jsx';
import { TABS } from './constants/index.js';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.CHAT);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [lastSearchMatches, setLastSearchMatches] = useState(null);
  const [streaming, setStreaming] = useState(true);
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem('doclens_theme') || 'dark';
    } catch {
      return 'dark';
    }
  });

  const newChatRef = useRef(null);
  const { toasts, toast, dismiss } = useToast();

  useEffect(() => {
    try {
      localStorage.setItem('doclens_theme', theme);
    } catch {}
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  function toggleTheme() {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }

  function handleDocSelect(id) {
    setSelectedDocId((prev) => (prev === id ? null : id));
  }

  function handleDocDelete(id) {
    setDocuments((prev) => prev.filter((d) => d.id !== id));
    if (selectedDocId === id) setSelectedDocId(null);
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null;
  const contextText = selectedDoc ? selectedDoc.filename : 'All Uploaded Documents';

  return (
    <ErrorBoundary>
      <div className="app">
        {/* ── Top Bar (Brand left, Context centered, Swagger + Theme right) ── */}
        <header className="topbar">
          <div className="topbar__logo-tile">
            <div className="topbar__logo-icon">
              <Sparkles size={18} strokeWidth={1.5} color="var(--btn-primary-text)" />
            </div>
            <div className="topbar__brand">
              <div className="topbar__brand-top">
                <span className="topbar__logo-text">DocLens</span>
                <span className="topbar__badge">AI RAG</span>
              </div>
              <span className="topbar__stack">Spring AI · PostgreSQL pgvector · Groq</span>
            </div>
          </div>

          <div className="topbar__center">
            <div className="context-pill" title={`Context: ${contextText}`}>
              <span className="context-dot" />
              <span className="context-label">Context:</span>
              <span className="context-value">{contextText}</span>
            </div>
          </div>

          <div className="topbar__right">
            <a
              href={`${API_BASE}/swagger-ui.html`}
              target="_blank"
              rel="noreferrer"
              className="btn-text"
              style={{ fontSize: 13 }}
            >
              Swagger API ↗
            </a>
            <button
              type="button"
              className="btn-icon theme-toggle"
              onClick={toggleTheme}
              title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
              aria-label="Toggle light/dark theme"
            >
              {theme === 'dark' ? (
                <Sun size={17} strokeWidth={1.5} />
              ) : (
                <Moon size={17} strokeWidth={1.5} />
              )}
            </button>
          </div>
        </header>

        <div className="body">
          <Sidebar
            documents={documents}
            setDocuments={setDocuments}
            selectedDocId={selectedDocId}
            onSelect={handleDocSelect}
            onDelete={handleDocDelete}
            toast={toast}
          />

          <main className="main">
            {/* ── Tabs Bar (Tabs left, Stream toggle + Refresh right) ── */}
            <div className="tabs-bar">
              <nav className="tabs" role="tablist">
                {Object.values(TABS).map((tab) => (
                  <button
                    key={tab}
                    role="tab"
                    aria-selected={activeTab === tab}
                    className={`tab${activeTab === tab ? ' tab--active' : ''}`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab}
                  </button>
                ))}
              </nav>

              <div className="tabs-bar__right">
                <div className="stream-switch">
                  <span className="stream-switch__label">Stream Tokens</span>
                  <button
                    type="button"
                    className={`stream-switch__track${streaming ? ' stream-switch__track--on' : ''}`}
                    role="switch"
                    aria-checked={streaming}
                    title={streaming ? 'Streaming on' : 'Streaming off'}
                    onClick={() => setStreaming((prev) => !prev)}
                  >
                    <span className="stream-switch__knob" />
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  title="New chat"
                  aria-label="New chat"
                  onClick={() => newChatRef.current?.()}
                >
                  <RotateCcw size={15} strokeWidth={1.5} />
                </button>
              </div>
            </div>

            <div className="tab-panel">
              {activeTab === TABS.CHAT && (
                <ChatPanel
                  selectedDoc={selectedDoc}
                  documents={documents}
                  toast={toast}
                  streaming={streaming}
                  onUploadOpen={() => setUploadOpen(true)}
                  registerNewChat={(fn) => { newChatRef.current = fn; }}
                />
              )}
              {activeTab === TABS.SEARCH && (
                <SearchPanel
                  documents={documents}
                  selectedDocId={selectedDocId}
                  onSearchResults={setLastSearchMatches}
                  toast={toast}
                />
              )}
              {activeTab === TABS.CHUNKS && (
                <ChunksPanel matches={lastSearchMatches} toast={toast} />
              )}
            </div>
          </main>
        </div>

        {uploadOpen && (
          <UploadDialog
            onClose={() => setUploadOpen(false)}
            onUploaded={(newDocs) => setDocuments((prev) => [...newDocs, ...prev])}
            toast={toast}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </ErrorBoundary>
  );
}
