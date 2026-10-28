import { ChunkCard } from './ChunkCard.jsx';
import '../../styles/ChunksPanel.css';

export default function ChunksPanel({ chunks, source, query, matches, toast }) {
  const list = chunks !== undefined ? chunks : matches;

  if (list === null) {
    return (
      <div className="chunks-panel">
        <div className="chunks-panel-inner">
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="empty-state__heading">No chunks retrieved yet</p>
            <p className="empty-state__sub">
              Ask a question or run a search to see the retrieved chunks here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (list.length === 0) {
    return (
      <div className="chunks-panel">
        <div className="chunks-panel-inner">
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="empty-state__heading">No matches</p>
            <p className="empty-state__sub">
              No chunks were found matching the query.
            </p>
          </div>
        </div>
      </div>
    );
  }

  const sourceText = source === 'chat' ? 'From chat' : 'From search';
  const queryText = query ? ` "${query}"` : '';

  return (
    <div className="chunks-panel">
      <div className="chunks-panel-inner">
        <div className="chunks-header">
          {sourceText}:{queryText} · {list.length} chunk{list.length !== 1 ? 's' : ''}
        </div>
        <div className="chunks-list">
          {list.map((m, i) => (
            <ChunkCard key={i} match={m} toast={toast} />
          ))}
        </div>
      </div>
    </div>
  );
}
