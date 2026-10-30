import { useState, useRef, useEffect } from 'react';
import { Send, Mic, Copy, Sparkles, Plus } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { chatQuery, createChatStream, semanticSearch, saveCitations } from '../../services/api.js';
import { ChunkCard } from '../search/ChunkCard.jsx';
import '../../styles/ChatPanel.css';

const SUGGESTIONS = [
  {
    title: 'Summarize Key Points',
    desc: 'Executive highlights of this document.',
    prompt: 'Summarize the key points and executive highlights of this document.',
  },
  {
    title: 'Interview / Q&A Insights',
    desc: 'Critical questions and answers in the text.',
    prompt: 'What are the most critical questions and answers covered in this text?',
  },
  {
    title: 'Action Items & Deadlines',
    desc: 'Actionable takeaways and responsibilities.',
    prompt: 'List all actionable takeaways, deadlines, and responsibilities mentioned.',
  },
  {
    title: 'Technical Concepts',
    desc: 'Main technical concepts and architecture.',
    prompt: 'Explain the main technical concepts and architecture described in this document.',
  },
];

function CitationsBlock({ citations, toast }) {
  const [expandedIndices, setExpandedIndices] = useState({});

  function toggle(index) {
    setExpandedIndices((prev) => ({
      ...prev,
      [index]: !prev[index],
    }));
  }

  return (
    <div className="citations-block">
      <div className="citations-pills">
        {citations.map((c, i) => {
          const isExpanded = !!expandedIndices[i];
          const hasIndex = typeof c?.chunkIndex === 'number' && !isNaN(c.chunkIndex);
          const hasPage = typeof c?.pageNumber === 'number' && !isNaN(c.pageNumber);

          const parts = [c?.fileName || 'Document'];
          if (hasIndex) parts.push(`Chunk #${c.chunkIndex}`);
          if (hasPage) parts.push(`Page ${c.pageNumber}`);
          const label = parts.join(' · ');

          return (
            <button
              key={i}
              type="button"
              className={`citation-chip${isExpanded ? ' citation-chip--active' : ''}`}
              onClick={() => toggle(i)}
              title={label}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="citations-expanded-list">
        {citations.map((c, i) =>
          expandedIndices[i] ? (
            <div key={i} className="citation-expanded-item">
              <ChunkCard match={c} toast={toast} />
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}

function AssistantMessage({ msg, toast }) {
  function copyText() {
    navigator.clipboard.writeText(msg.text).catch(() => {});
  }

  return (
    <div className="message message--assistant">
      <div className="message__body">
        <div className="message__markdown">
          <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.text}</ReactMarkdown>
          {msg.streaming && <span className="stream-cursor" />}
          {msg.stopped && <span className="message__stopped"> (stopped)</span>}
        </div>

        {msg.citations && msg.citations.length > 0 && (
          <CitationsBlock citations={msg.citations} toast={toast} />
        )}

        <div className="message__meta">
          {msg.responseTimeMs != null && (
            <span className="message__time">
              {(msg.responseTimeMs / 1000).toFixed(1)}s
            </span>
          )}
          {!msg.streaming && (
            <button className="btn-icon" title="Copy" onClick={copyText}>
              <Copy size={14} strokeWidth={1.5} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default function ChatPanel({
  selectedDoc,
  documents,
  toast,
  streaming,
  setStreaming,
  conversationId,
  setConversationId,
  messages,
  setMessages,
  loading,
  setLoading,
  onFeedUpdate,
  onUploadOpen,
  onConversationCreated,
  registerNewChat,
}) {
  const [input, setInput] = useState('');
  const conversationIdRef = useRef(conversationId);
  const abortRef = useRef(null);
  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [input]);

  function handleResetChat() {
    if (abortRef.current) abortRef.current.abort();
    abortRef.current = null;
    setInput('');
  }

  // Clear input when switching chats or starting new chat
  useEffect(() => {
    setInput('');
  }, [conversationId]);

  // Expose reset to parent
  useEffect(() => {
    registerNewChat?.(handleResetChat);
  }, [registerNewChat]);

  function buildPayload(question) {
    const payload = { question };
    if (conversationIdRef.current) payload.conversationId = conversationIdRef.current;
    if (selectedDoc) payload.documentId = selectedDoc.id;
    return payload;
  }

  async function sendNonStreaming(question) {
    const payload = buildPayload(question);
    const { data, error } = await chatQuery(payload);
    if (error) {
      toast(error, 'error');
      setMessages((prev) => prev.slice(0, -1));
      return;
    }
    const isNew = !conversationIdRef.current && data.conversationId;
    conversationIdRef.current = data.conversationId;
    setConversationId(data.conversationId);
    const citations = data.citations ?? [];
    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'pending'
          ? {
              id: Date.now(),
              role: 'assistant',
              text: data.answer,
              citations: citations.length > 0 ? citations : undefined,
              responseTimeMs: data.responseTimeMs,
            }
          : m
      )
    );
    if (citations.length > 0) {
      onFeedUpdate?.({ chunks: citations, source: 'chat', query: question });
    }
    if (isNew) {
      onConversationCreated?.();
    }
  }

  async function sendStreaming(question) {
    // First message must go through /query to obtain a conversationId (§3.7)
    if (!conversationIdRef.current) {
      await sendNonStreaming(question);
      return;
    }

    // Fix 3: fire parallel similarity search alongside stream
    let parallelMatches = null;
    const searchPayload = {
      query: question,
      similaritySearch: 0.0,
    };
    if (selectedDoc) searchPayload.documentId = selectedDoc.id;

    const searchPromise = semanticSearch(searchPayload)
      .then(({ data }) => {
        if (data?.matches) {
          parallelMatches = data.matches;
        }
      })
      .catch(() => {
        // Parallel search failure must not break the stream
      });

    const controller = new AbortController();
    abortRef.current = controller;

    let response;
    try {
      response = await createChatStream(buildPayload(question), controller.signal);
    } catch (err) {
      if (err.name === 'AbortError') return;
      toast('Could not reach the server. Make sure the backend is running on port 8080.', 'error');
      setMessages((prev) => prev.slice(0, -1));
      return;
    }

    if (!response.ok) {
      toast(`Stream request failed (HTTP ${response.status}).`, 'error');
      setMessages((prev) => prev.slice(0, -1));
      return;
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const assistantId = Date.now();
    let accumulated = '';
    let buffer = '';
    // Throttle renders so partial Markdown parses into stable layout.
    const THROTTLE_MS = 35;
    let lastRenderTime = 0;

    setMessages((prev) =>
      prev.map((m) =>
        m.id === 'pending'
          ? { id: assistantId, role: 'assistant', text: '', streaming: true }
          : m
      )
    );

    function flushRender(streamEnded = false) {
      const now = Date.now();
      if (streamEnded || now - lastRenderTime >= THROTTLE_MS) {
        lastRenderTime = now;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId ? { ...m, text: accumulated } : m
          )
        );
      }
    }

    // Parse all complete SSE events out of a raw text block.
    function parseEvents(raw) {
      // Split on double-newline SSE event boundaries
      const events = raw.split(/\r?\n\r?\n/);
      for (const event of events) {
        if (!event.trim()) continue;
        const dataLines = event
          .split(/\r?\n/)
          .filter((l) => l.startsWith('data:'));
        if (!dataLines.length) continue;
        // Strip exactly the 5 characters "data:", keep the remainder verbatim.
        const token = dataLines.map((l) => l.slice(5)).join('\n');
        if (token.trim() === '[DONE]') return;
        accumulated += token;
      }
    }

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        // Decode in streaming mode so multi-byte chars never split across reads
        buffer += decoder.decode(value, { stream: true });

        // Hold back everything after the last complete event boundary using /\r?\n\r?\n/
        const boundaryRegex = /\r?\n\r?\n/g;
        let lastMatch = null;
        let m;
        while ((m = boundaryRegex.exec(buffer)) !== null) {
          lastMatch = m;
        }
        if (lastMatch !== null) {
          const splitIndex = lastMatch.index + lastMatch[0].length;
          const complete = buffer.slice(0, splitIndex);
          buffer = buffer.slice(splitIndex);
          parseEvents(complete);
          flushRender();
        }
      }

      // Flush any remaining buffer content
      if (buffer.trim()) {
        parseEvents(buffer);
        buffer = '';
      }

      // Final unconditional render — ensures last tokens are never lost to throttle
      flushRender(true);

      try { await reader.cancel(); } catch (_) {}

      // Await parallel search completion to attach citations
      try { await searchPromise; } catch (_) {}
      const citations = parallelMatches ?? [];

      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId
            ? { ...m, text: accumulated, streaming: false, citations: citations.length ? citations : undefined }
            : m
        )
      );

      if (citations.length > 0) {
        onFeedUpdate?.({ chunks: citations, source: 'chat', query: question });

        // Step 7: Stream save-back (POST citations in background, never block answer, no error toast)
        if (conversationIdRef.current) {
          saveCitations(conversationIdRef.current, citations).catch(() => {});
        }
      }
    } catch (err) {
      if (err.name === 'AbortError') {
        const citations = parallelMatches ? parallelMatches : undefined;
        setMessages((prev) =>
          prev.map((m) =>
            m.id === assistantId
              ? { ...m, streaming: false, stopped: true, citations }
              : m
          )
        );
        if (citations && citations.length > 0) {
          onFeedUpdate?.({ chunks: citations, source: 'chat', query: question });
          if (conversationIdRef.current) {
            saveCitations(conversationIdRef.current, citations).catch(() => {});
          }
        }
        return;
      }
      toast('An error occurred while streaming. The partial answer has been kept.', 'error');
      setMessages((prev) =>
        prev.map((m) =>
          m.id === assistantId ? { ...m, streaming: false } : m
        )
      );
    }
  }

  async function handleSend() {
    const question = input.trim();
    if (!question || loading) return;

    setInput('');
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { id: `${Date.now()}u`, role: 'user', text: question },
      { id: 'pending', role: 'assistant', text: '', streaming: true },
    ]);

    if (streaming) {
      await sendStreaming(question);
    } else {
      await sendNonStreaming(question);
    }

    abortRef.current = null;
    setLoading(false);
  }

  function handleStop() {
    if (abortRef.current) {
      abortRef.current.abort();
      abortRef.current = null;
      setLoading(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="chat-panel">
      <div className="chat-messages">
        <div className="chat-messages-inner">
          {messages.length === 0 ? (
            <div className="chat-hero">
              <div className="chat-hero__icon">
                <Sparkles size={28} strokeWidth={1.5} color="var(--btn-primary-text)" />
              </div>
              <h1 className="chat-hero__title">DocLens</h1>
              <p className="chat-hero__sub">
                Upload PDFs and chat with your documents — answers grounded in facts,
                with source citations and page numbers.
              </p>
              <div className="chat-hero__cards">
                {SUGGESTIONS.map((s) => (
                  <button
                    key={s.title}
                    className="hero-card"
                    onClick={() => setInput(s.prompt)}
                  >
                    <span className="hero-card__title">{s.title}</span>
                    <span className="hero-card__desc">{s.desc}</span>
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((msg) =>
              msg.role === 'user' ? (
                <div key={msg.id} className="message message--user">
                  <div className="message__bubble">{msg.text}</div>
                </div>
              ) : (
                <AssistantMessage key={msg.id} msg={msg} toast={toast} />
              )
            )
          )}
          <div ref={bottomRef} />
        </div>
      </div>

      <div className="chat-input-area">
        {loading && (
          <div className="ai-responding-indicator">
            <span className="ai-responding-dots">
              <span className="dot" />
              <span className="dot" />
              <span className="dot" />
            </span>
            <span className="ai-responding-text">AI is responding...</span>
          </div>
        )}
        <div className="chat-input-inner">
          <button
            className="btn-icon"
            title="Upload document"
            onClick={onUploadOpen}
            style={{ marginRight: 4 }}
          >
            <Plus size={18} strokeWidth={1.5} />
          </button>
          <textarea
            ref={textareaRef}
            className="chat-textarea"
            placeholder={loading ? 'Waiting for response...' : 'Ask a question…'}
            rows={1}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            disabled={loading && !streaming}
          />
          <div className="chat-input-actions">
            <button className="btn-icon" title="Voice input (coming soon)" disabled>
              <Mic size={16} strokeWidth={1.5} />
            </button>
            {loading && streaming ? (
              <button
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={handleStop}
              >
                Stop
              </button>
            ) : (
              <button
                className="btn-primary"
                style={{ padding: '8px 16px', fontSize: 13 }}
                onClick={handleSend}
                disabled={!input.trim() || loading}
              >
                <Send size={14} strokeWidth={2} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
