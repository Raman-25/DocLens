import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8080';

const http = axios.create({ baseURL: API_BASE });

/**
 * Extracts a human-readable error message from any thrown error.
 * Never returns raw JSON, stack traces, or [object Object].
 */
function extractError(err) {
  if (!err.response) {
    return 'Could not reach the server. Make sure the backend is running on port 8080.';
  }
  const body = err.response.data;
  if (body && typeof body === 'object') {
    if (body.message) return body.message;
    if (body.error) return body.error;
  }
  return `Request failed (HTTP ${err.response.status}).`;
}

/**
 * Unwraps the standard ApiResponse envelope.
 * Returns { data, error } — exactly one is non-null.
 */
async function call(requestFn) {
  try {
    const res = await requestFn();
    const envelope = res.data;
    if (!envelope.success) {
      return { data: null, error: envelope.message || 'An error occurred.' };
    }
    return { data: envelope.data, error: null };
  } catch (err) {
    console.error('API error:', err);
    return { data: null, error: extractError(err) };
  }
}

// ── §3.1 — List documents ──────────────────────────────────────────
// NOTE: this DTO uses `filename` (lowercase n), NOT `fileName`.
export function listDocuments() {
  return call(() => http.get('/api/v1/documents'));
}

// ── §3.4 — Get one document ───────────────────────────────────────
export function getDocument(id) {
  return call(() => http.get(`/api/v1/documents/${id}`));
}

// ── §3.5 — Delete document ────────────────────────────────────────
export function deleteDocument(id) {
  return call(() => http.delete(`/api/v1/documents/${id}`));
}

// ── §3.2 — Upload single file ─────────────────────────────────────
// NOTE: upload DTO uses `fileName` (capital N) — opposite of §3.1.
export function uploadFile(file, onProgress) {
  const form = new FormData();
  form.append('file', file);
  return call(() =>
    http.post('/api/v1/documents/upload', form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    })
  );
}

// ── §3.3 — Upload multiple files ──────────────────────────────────
// NOTE: upload DTO uses `fileName` (capital N) — opposite of §3.1.
export function uploadFiles(files, onProgress) {
  const form = new FormData();
  files.forEach((f) => form.append('files', f));
  return call(() =>
    http.post('/api/v1/documents/upload-multiple', form, {
      onUploadProgress: (e) => {
        if (onProgress && e.total) {
          onProgress(Math.round((e.loaded / e.total) * 100));
        }
      },
    })
  );
}

// ── §3.6 — Chat query (non-streaming) ─────────────────────────────
// NOTE: chat uses `minSimilarity`, NOT `similaritySearch` (that belongs to §3.8).
export function chatQuery(payload) {
  return call(() => http.post('/api/v1/chat/query', payload));
}

// ── §3.8 — Semantic search ────────────────────────────────────────
// NOTE: search uses `similaritySearch`, NOT `minSimilarity` (that belongs to §3.6).
export function semanticSearch(payload) {
  return call(() => http.post('/api/v1/chat/search/similarity', payload));
}

// ── §3.7 — Streaming chat ─────────────────────────────────────────
// Returns raw fetch (not axios) for SSE. Caller manages the stream.
// Stream returns bare text tokens — NO JSON envelope, NO conversationId.
export function createChatStream(payload, signal) {
  return fetch(`${API_BASE}/api/v1/chat/stream`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
    signal,
  });
}
