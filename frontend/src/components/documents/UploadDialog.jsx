import { useState, useRef, useEffect } from 'react';
import { X, Upload, FileText, Trash2, AlertCircle, CheckCircle2 } from 'lucide-react';
import { uploadFiles } from '../../services/api.js';
import '../../styles/UploadDialog.css';

function formatBytes(bytes) {
  if (!bytes || bytes === 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadDialog({ initialFiles = [], onClose, onUploaded, toast }) {
  const [files, setFiles] = useState(() => (initialFiles?.length ? Array.from(initialFiles) : []));
  const [fileStates, setFileStates] = useState(() =>
    initialFiles?.length
      ? Array.from(initialFiles).map((f) => ({
          name: f.name,
          size: f.size,
          type: f.type || 'application/octet-stream',
          status: 'ready', // 'ready' | 'uploading' | 'done' | 'failed'
          error: null,
        }))
      : []
  );
  const [uploading, setUploading] = useState(false);
  const [overallProgress, setOverallProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    if (initialFiles && initialFiles.length > 0) {
      addFiles(initialFiles);
    }
  }, [initialFiles]);

  // Esc closes the dialog (Fix 6 item 3b)
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape' && !uploading) {
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [uploading, onClose]);

  // Re-selecting files appends to the batch (Fix 6 item 3a)
  function addFiles(incoming) {
    const list = Array.from(incoming);
    if (!list.length) return;
    setFiles((prev) => [...prev, ...list]);
    setFileStates((prev) => [
      ...prev,
      ...list.map((f) => ({
        name: f.name,
        size: f.size,
        type: f.type || 'application/octet-stream',
        status: 'ready', // 'ready' | 'uploading' | 'done' | 'failed'
        error: null,
      })),
    ]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    addFiles(e.dataTransfer.files);
  }

  function handleDragOver(e) {
    e.preventDefault();
    setDragOver(true);
  }

  function handleDragLeave() {
    setDragOver(false);
  }

  function handleInputChange(e) {
    addFiles(e.target.files);
    e.target.value = '';
  }

  function handleClearAll() {
    if (uploading) return;
    setFiles([]);
    setFileStates([]);
    setOverallProgress(0);
  }

  async function handleUpload() {
    if (!files.length || uploading) return;
    setUploading(true);
    setOverallProgress(0);

    // Set all ready items to uploading state
    setFileStates((prev) =>
      prev.map((s) => ({ ...s, status: 'uploading', error: null }))
    );

    const { data, error } = await uploadFiles(files, (pct) => {
      setOverallProgress(pct);
    });

    setUploading(false);

    if (error) {
      // Whole-batch request error
      setFileStates((prev) =>
        prev.map((s) => ({
          ...s,
          status: 'failed',
          error: error || 'Upload failed.',
        }))
      );
      toast(`Upload failed: ${error}`, 'error');
      return;
    }

    // Per-file results (Fix 4, Fix 7)
    const results = Array.isArray(data) ? data : [data];
    let successCount = 0;

    setFileStates((prev) =>
      prev.map((s, i) => {
        const r = results[i];
        if (!r) {
          return { ...s, status: 'failed', error: 'No response for this file.' };
        }
        if (r.status === 'FAILED') {
          return {
            ...s,
            status: 'failed',
            error: r.message ?? 'Processing failed.',
          };
        }
        successCount++;
        return { ...s, status: 'done', error: null };
      })
    );

    // Call onUploaded to refetch documents from the server (NO fabricated rows)
    onUploaded();

    if (successCount > 0) {
      toast(
        `${successCount} file${successCount > 1 ? 's' : ''} uploaded successfully.`,
        'success'
      );
    }
  }

  const totalBytes = files.reduce((acc, f) => acc + f.size, 0);

  return (
    <div
      className="backdrop"
      onClick={(e) => {
        if (e.target === e.currentTarget && !uploading) onClose();
      }}
    >
      <div className="upload-modal" role="dialog" aria-modal="true" aria-labelledby="upload-title">
        {/* Header */}
        <div className="upload-modal__header">
          <div className="upload-modal__header-left">
            <div className="upload-modal__icon-tile">
              <Upload size={18} strokeWidth={2} color="var(--accent)" />
            </div>
            <div>
              <h2 id="upload-title" className="upload-modal__title">Upload Documents</h2>
              <p className="upload-modal__subtitle">PDF · DOCX · TXT · MD · CSV</p>
            </div>
          </div>
          <button
            className="btn-icon upload-modal__close"
            onClick={onClose}
            disabled={uploading}
            title="Close"
            aria-label="Close dialog"
          >
            <X size={18} strokeWidth={1.5} />
          </button>
        </div>

        {/* Dropzone */}
        <div
          className={`upload-dropzone${dragOver ? ' upload-dropzone--over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => e.key === 'Enter' && !uploading && inputRef.current?.click()}
        >
          <div className="upload-dropzone__icon-box">
            <Upload size={22} strokeWidth={1.75} />
          </div>
          <p className="upload-dropzone__prompt">
            Drag &amp; drop files here
          </p>
          <p className="upload-dropzone__browse">
            or <span className="upload-dropzone__browse-link">click to browse</span>
          </p>

          <div className="upload-type-chips">
            <span className="type-chip type-chip--pdf">.pdf</span>
            <span className="type-chip type-chip--docx">.docx</span>
            <span className="type-chip type-chip--txt">.txt</span>
            <span className="type-chip type-chip--md">.md</span>
            <span className="type-chip type-chip--csv">.csv</span>
          </div>
        </div>

        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        {/* Overall progress indicator (Fix 6 item 3c) */}
        {uploading && (
          <div className="upload-overall-progress">
            <div className="upload-overall-progress__bar">
              <div
                className="upload-overall-progress__fill"
                style={{ width: `${overallProgress}%` }}
              />
            </div>
            <span className="upload-overall-progress__label">
              Uploading batch… {overallProgress}%
            </span>
          </div>
        )}

        {/* File summary and files list */}
        {fileStates.length > 0 && (
          <div className="upload-files-section">
            <div className="upload-summary-row">
              <span className="upload-summary-text">
                {fileStates.length} file(s) · {formatBytes(totalBytes)}
              </span>
              {!uploading && (
                <button
                  type="button"
                  className="upload-clear-all"
                  onClick={handleClearAll}
                >
                  <Trash2 size={13} strokeWidth={1.5} />
                  <span>Clear all</span>
                </button>
              )}
            </div>

            <div className="upload-file-rows-list">
              {fileStates.map((s, i) => {
                const isFailed = s.status === 'failed';
                const isDone = s.status === 'done';
                const isUploading = s.status === 'uploading';

                return (
                  <div
                    key={i}
                    className={`upload-file-card${isFailed ? ' upload-file-card--failed' : isDone ? ' upload-file-card--done' : ''}`}
                  >
                    <div className="upload-file-card__main">
                      <div className="upload-file-card__icon-box">
                        <FileText size={16} strokeWidth={1.5} />
                      </div>
                      <div className="upload-file-card__info">
                        <span className="upload-file-card__name" title={s.name}>
                          {s.name}
                        </span>
                      </div>
                      <span className="upload-file-card__size">
                        {formatBytes(s.size)}
                      </span>
                      <div className="upload-file-card__status-icon">
                        {isFailed && (
                          <AlertCircle size={16} strokeWidth={1.75} className="status-icon--failed" />
                        )}
                        {isDone && (
                          <CheckCircle2 size={16} strokeWidth={1.75} className="status-icon--done" />
                        )}
                      </div>
                    </div>

                    {/* Progress line */}
                    <div className="upload-file-card__bar">
                      <div
                        className={`upload-file-card__bar-fill${
                          isFailed
                            ? ' upload-file-card__bar-fill--failed'
                            : isDone
                            ? ' upload-file-card__bar-fill--done'
                            : isUploading
                            ? ' upload-file-card__bar-fill--active'
                            : ''
                        }`}
                      />
                    </div>

                    {/* Inline error message */}
                    {isFailed && s.error && (
                      <div className="upload-file-card__error-msg">
                        {s.error}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer actions */}
        <div className="upload-modal__footer">
          {fileStates.some((s) => s.status === 'ready') && (
            <button
              type="button"
              className="btn-primary"
              onClick={handleUpload}
              disabled={uploading}
            >
              {uploading ? 'Uploading…' : 'Upload'}
            </button>
          )}
          <button
            type="button"
            className="upload-modal__close-btn"
            onClick={onClose}
            disabled={uploading}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
