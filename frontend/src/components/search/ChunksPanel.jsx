import { ChunkCard } from './ChunkCard.jsx';

export default function ChunksPanel({ matches, toast }) {
  if (matches === null) {
    return (
      <div className="chunks-panel">
        <div className="chunks-panel-inner">
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="empty-state__heading">No search results yet</p>
            <p className="empty-state__sub">
              Run a search in the Search tab to see retrieved chunks here.
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (matches.length === 0) {
    return (
      <div className="chunks-panel">
        <div className="chunks-panel-inner">
          <div className="empty-state" style={{ flex: 1 }}>
            <p className="empty-state__heading">No matches</p>
            <p className="empty-state__sub">
              The last search returned no results.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="chunks-panel">
      <div className="chunks-panel-inner">
        <div className="chunks-header">
          {matches.length} chunk{matches.length !== 1 ? 's' : ''} from last search
        </div>
        <div className="chunks-list">
          {matches.map((m, i) => (
            <ChunkCard key={i} match={m} toast={toast} />
          ))}
        </div>
      </div>
    </div>
  );
}
