import { useState } from 'react';
import { FileText, Copy, Check } from 'lucide-react';

function getTruncatedSnippet(text, maxLen = 300) {
  if (!text || text.length <= maxLen) return text || '';
  const sub = text.slice(0, maxLen);
  const lastSpace = sub.lastIndexOf(' ');
  const cut = lastSpace > 200 ? sub.slice(0, lastSpace) : sub;
  return `${cut}…`;
}

export function ChunkCard({ match, toast }) {
  const [expanded, setExpanded] = useState(false);
  const [copied, setCopied] = useState(false);

  const snippet = match?.snippet ?? '';
  const isLong = snippet.length > 300;
  const displayText = expanded || !isLong ? snippet : getTruncatedSnippet(snippet, 300);

  const hasIndex = typeof match?.chunkIndex === 'number' && !isNaN(match.chunkIndex);
  const hasPage = typeof match?.pageNumber === 'number' && !isNaN(match.pageNumber);
  const hasScore = typeof match?.similarityScore === 'number' && !isNaN(match.similarityScore);
  const scorePercent = hasScore ? Math.round(match.similarityScore * 100) : null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      if (toast) {
        toast('Chunk text copied to clipboard.', 'success');
      }
    } catch {
      if (toast) {
        toast('Failed to copy chunk text.', 'error');
      }
    }
  }

  return (
    <div className="chunk-card">
      <div className="chunk-card__header">
        <div className="chunk-card__meta-group">
          <div className="chunk-card__file-group" title={match?.fileName}>
            <FileText size={15} strokeWidth={1.5} className="chunk-card__file-icon" />
            <span className="chunk-card__file">{match?.fileName || 'Document'}</span>
          </div>

          <div className="chunk-card__badges">
            {hasIndex && (
              <span className="chunk-card__tag">Chunk #{match.chunkIndex}</span>
            )}
            {hasPage && (
              <span className="chunk-card__tag">Page {match.pageNumber}</span>
            )}
            {hasScore && (
              <div className="chunk-card__sim-box" title={`Similarity: ${scorePercent}%`}>
                <div className="similarity-bar-track">
                  <div
                    className="similarity-bar-fill"
                    style={{ width: `${Math.min(Math.max(scorePercent, 0), 100)}%` }}
                  />
                </div>
                <span className="chunk-card__score">{scorePercent}%</span>
              </div>
            )}
          </div>
        </div>

        <button
          type="button"
          className="btn-icon chunk-card__copy-btn"
          title="Copy chunk text"
          aria-label="Copy chunk text"
          onClick={handleCopy}
        >
          {copied ? (
            <Check size={14} strokeWidth={2} style={{ color: 'var(--status-green)' }} />
          ) : (
            <Copy size={14} strokeWidth={1.5} />
          )}
        </button>
      </div>

      <div className="chunk-card__body">
        <p className="chunk-card__snippet">{displayText}</p>
        {isLong && (
          <button
            type="button"
            className="chunk-card__expand"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? 'Show less' : 'Show more'}
          </button>
        )}
      </div>
    </div>
  );
}
