import { useState, useRef, useEffect } from 'react';
import { Sparkles, RotateCcw, Sun, Moon, PanelLeft, Wifi } from 'lucide-react';
import ErrorBoundary from './components/ErrorBoundary.jsx';
import { ToastContainer, useToast } from './components/Toast.jsx';
import Sidebar from './components/Sidebar.jsx';
import ChatPanel from './components/chat/ChatPanel.jsx';
import SearchPanel from './components/search/SearchPanel.jsx';
import ChunksPanel from './components/search/ChunksPanel.jsx';
import UploadDialog from './components/documents/UploadDialog.jsx';
import { TABS } from './constants/index.js';
import { listDocuments } from './services/api.js';
import './styles/App.css';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

export default function App() {
  const [activeTab, setActiveTab] = useState(TABS.CHAT);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [stagedFiles, setStagedFiles] = useState([]);
  const [selectedDocId, setSelectedDocId] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [streaming, setStreaming] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Fix 5: Unified chunks feed (chat + search citations in Chunks tab)
  const [feedChunks, setFeedChunks] = useState(null);
  const [feedSource, setFeedSource] = useState(null); // 'chat' | 'search'
  const [feedQuery, setFeedQuery] = useState('');

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

  function handleFeedUpdate({ chunks, source, query }) {
    setFeedChunks(chunks);
    setFeedSource(source);
    setFeedQuery(query || '');
  }

  function handleOpenUpload(incoming = []) {
    setStagedFiles(incoming && incoming.length ? Array.from(incoming) : []);
    setUploadOpen(true);
  }

  async function handleRefreshDocuments() {
    const { data } = await listDocuments();
    if (data) setDocuments(data);
  }

  const selectedDoc = documents.find((d) => d.id === selectedDocId) ?? null;
  const contextText = selectedDoc ? selectedDoc.filename : 'All Uploaded Documents';

  return (
    <ErrorBoundary>
      <div className="app">
        {/* ── Top Bar (Brand left, Context centered, Swagger + Theme right) ── */}
        <header className="topbar">
          <div className="topbar__left-group">
            {/* Fix 11: Sidebar toggle button */}
            <button
              type="button"
              className={`btn-icon sidebar-toggle-btn${!sidebarOpen ? ' sidebar-toggle-btn--collapsed' : ''}`}
              onClick={() => setSidebarOpen((prev) => !prev)}
              title={sidebarOpen ? 'Collapse sidebar' : 'Open sidebar'}
              aria-label="Toggle sidebar"
            >
              <PanelLeft size={18} strokeWidth={1.5} />
            </button>

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
            isOpen={sidebarOpen}
            onClose={() => setSidebarOpen(false)}
            onUploadOpen={handleOpenUpload}
            toast={toast}
          />

          <main className="main">
            {/* ── Tabs Bar (Tabs left, Stream pill + New chat + Refresh right — Fix 8) ── */}
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
                {/* Fix 8: Streaming pill + New chat replace the old toggle row */}
                <button
                  type="button"
                  className={`streaming-pill${streaming ? ' streaming-pill--active' : ''}`}
                  onClick={() => setStreaming((prev) => !prev)}
                  title={streaming ? 'Streaming on (click to disable)' : 'Streaming off (click to enable)'}
                  aria-label="Toggle streaming mode"
                >
                  <Wifi size={13} strokeWidth={2.2} />
                  <span>Streaming</span>
                </button>
                <button
                  type="button"
                  className="toolbar-new-chat-btn"
                  onClick={() => newChatRef.current?.()}
                  title="New chat"
                  aria-label="New chat"
                >
                  <RotateCcw size={13} strokeWidth={1.8} />
                  <span>New chat</span>
                </button>
                <button
                  type="button"
                  className="btn-icon"
                  title="Reset conversation"
                  aria-label="Reset conversation"
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
                  setStreaming={setStreaming}
                  onFeedUpdate={handleFeedUpdate}
                  onUploadOpen={() => handleOpenUpload([])}
                  registerNewChat={(fn) => { newChatRef.current = fn; }}
                />
              )}
              {activeTab === TABS.SEARCH && (
                <SearchPanel
                  documents={documents}
                  selectedDocId={selectedDocId}
                  onSearchResults={(matches, q) =>
                    handleFeedUpdate({ chunks: matches, source: 'search', query: q })
                  }
                  toast={toast}
                />
              )}
              {activeTab === TABS.CHUNKS && (
                <ChunksPanel
                  chunks={feedChunks}
                  source={feedSource}
                  query={feedQuery}
                  toast={toast}
                />
              )}
            </div>
          </main>
        </div>

        {uploadOpen && (
          <UploadDialog
            initialFiles={stagedFiles}
            onClose={() => {
              setUploadOpen(false);
              setStagedFiles([]);
            }}
            onUploaded={handleRefreshDocuments}
            toast={toast}
          />
        )}

        <ToastContainer toasts={toasts} onDismiss={dismiss} />
      </div>
    </ErrorBoundary>
  );
}
