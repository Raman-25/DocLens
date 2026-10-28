import { useState } from 'react';
import { semanticSearch } from '../../services/api.js';
import { ChunkCard } from './ChunkCard.jsx';

export default function SearchPanel({
  documents,
  selectedDocId,
  onSearchResults,
  toast,
}) {
  const [query, setQuery] = useState('');
  const [topK, setTopK] = useState(5);
  // NOTE: search uses `similaritySearch`, NOT `minSimilarity` (§3.8)
  const [similarityThreshold, setSimilarityThreshold] = useState(0.0);
  const [scopeDocId, setScopeDocId] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSearch() {
    const q = query.trim();
    if (!q) return;

    setLoading(true);
    const payload = {
      query: q,
      topK,
      similaritySearch: similarityThreshold,
    };
    if (scopeDocId) payload.documentId = scopeDocId;

    const { data, error } = await semanticSearch(payload);
    setLoading(false);

    if (error) {
      toast(error, 'error');
      return;
    }

    const matches = data.matches ?? [];
    setResults({ query: data.query, totalMatches: data.totalMatches, matches });
    onSearchResults(matches);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch();
  }

  return (
    <div className="search-panel">
      <div className="search-panel-inner">
        <div className="search-input-row">
          <input
            className="search-input"
            placeholder="Semantic search across your documents…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            className="btn-primary"
            onClick={handleSearch}
            disabled={!query.trim() || loading}
          >
            {loading ? 'Searching…' : 'Search'}
          </button>
        </div>

        <div className="search-controls">
          <div className="search-control">
            <div className="search-control__header">
              <span className="search-control__label">Top results</span>
              <span className="search-control__value">{topK}</span>
            </div>
            <input
              type="range"
              className="slider"
              min={1}
              max={20}
              step={1}
              value={topK}
              onChange={(e) => setTopK(Number(e.target.value))}
            />
          </div>

          <div className="search-control">
            <div className="search-control__header">
              <span className="search-control__label">Min similarity</span>
              <span className="search-control__value">{similarityThreshold.toFixed(2)}</span>
            </div>
            <input
              type="range"
              className="slider"
              min={0}
              max={1}
              step={0.05}
              value={similarityThreshold}
              onChange={(e) => setSimilarityThreshold(Number(e.target.value))}
            />
          </div>

          <div className="search-control">
            <span className="search-control__label">Document scope</span>
            <select
              className="scope-select"
              value={scopeDocId}
              onChange={(e) => setScopeDocId(e.target.value)}
            >
              <option value="">All documents</option>
              {documents.map((d) => (
                <option key={d.id} value={d.id}>
                  {d.filename}
                </option>
              ))}
            </select>
          </div>
        </div>

        {results === null ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="empty-state__heading">Search your documents</p>
            <p className="empty-state__sub">
              Enter a query above to find semantically similar chunks from your documents.
            </p>
          </div>
        ) : results.matches.length === 0 ? (
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="empty-state__heading">No matches</p>
            <p className="empty-state__sub">
              Try a different query or lower the similarity threshold.
            </p>
          </div>
        ) : (
          <>
            <div className="search-results-header">
              {results.totalMatches} result{results.totalMatches !== 1 ? 's' : ''} for "{results.query}"
            </div>
            <div className="search-results">
              {results.matches.map((m, i) => (
                <ChunkCard key={i} match={m} toast={toast} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
