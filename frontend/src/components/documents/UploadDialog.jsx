import { useState, useRef, useCallback } from 'react';
import { X, Upload } from 'lucide-react';
import { uploadFiles } from '../../services/api.js';

function FileRow({ name, progress, status, error }) {
  return (
    <div className="upload-file-row">
      <div className="upload-file-row__header">
        <span className="upload-file-row__name" title={name}>{name}</span>
        <span className="upload-file-row__status">{status}</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${progress}%` }} />
      </div>
      {error && <div className="upload-file-row__error">{error}</div>}
    </div>
  );
}

export default function UploadDialog({ onClose, onUploaded, toast }) {
  const [files, setFiles] = useState([]);
  const [fileStates, setFileStates] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  function addFiles(incoming) {
    const pdfs = Array.from(incoming);
    if (!pdfs.length) return;
    setFiles(pdfs);
    setFileStates(pdfs.map((f) => ({ name: f.name, progress: 0, status: 'Ready', error: null })));
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
  }

  function updateFileState(index, patch) {
    setFileStates((prev) =>
      prev.map((s, i) => (i === index ? { ...s, ...patch } : s))
    );
  }

  async function handleUpload() {
    if (!files.length || uploading) return;
    setUploading(true);

    // Set all to uploading
    setFileStates((prev) => prev.map((s) => ({ ...s, status: 'Uploading…', progress: 0 })));

    const { data, error } = await uploadFiles(files, (pct) => {
      setFileStates((prev) => prev.map((s) => ({ ...s, progress: pct })));
    });

    setUploading(false);

    if (error) {
      // Batch-level failure
      setFileStates((prev) =>
        prev.map((s) => ({ ...s, status: 'Failed', progress: 0, error }))
      );
      toast(`Upload failed: ${error}`, 'error');
      return;
    }

    // data is an array of §3.2 upload DTOs (fileName capital N)
    const results = Array.isArray(data) ? data : [data];
    let anyFailed = false;

    setFileStates((prev) =>
      prev.map((s, i) => {
        const r = results[i];
        if (!r) return { ...s, status: 'Failed', error: 'No response for this file.' };
        if (r.status === 'FAILED') {
          anyFailed = true;
          toast(`${s.name} failed to process.`, 'error');
          return { ...s, progress: 100, status: 'Failed', error: r.message ?? 'Processing failed.' };
        }
        return { ...s, progress: 100, status: 'Indexed' };
      })
    );

    // Build the list-compatible shape from upload response.
    // Upload DTO uses `fileName` (capital N); convert to `filename` for the sidebar list.
    const successDocs = results
      .filter((r) => r && r.status !== 'FAILED')
      .map((r) => ({
        id: r.id,
        filename: r.fileName,   // capital N → lowercase n for §3.1 shape
        fileSize: r.fileSize,
        totalPages: null,
        totalChunks: r.chunksCreated,
        status: r.status,
        createdAt: null,
        updatedAt: null,
        errorMessage: null,
        contentType: 'application/pdf',
      }));

    if (successDocs.length > 0) {
      onUploaded(successDocs);
      toast(
        `${successDocs.length} file${successDocs.length > 1 ? 's' : ''} uploaded successfully.`,
        'success'
      );
    }

    if (!anyFailed) {
      setTimeout(onClose, 800);
    }
  }

  return (
    <div className="backdrop" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="modal">
        <button className="btn-icon modal__close" onClick={onClose} title="Close">
          <X size={18} strokeWidth={1.5} />
        </button>
        <h2 className="modal__title">Upload documents</h2>

        <div
          className={`dropzone${dragOver ? ' dropzone--over' : ''}`}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => !uploading && inputRef.current?.click()}
        >
          <Upload size={28} strokeWidth={1.5} color="var(--text-muted)" />
          <p className="dropzone__heading">Drop your files here</p>
          <p className="dropzone__sub">PDF · DOCX · TXT · MD · CSV</p>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept=".pdf,.docx,.txt,.md,.csv"
          style={{ display: 'none' }}
          onChange={handleInputChange}
        />

        {fileStates.length > 0 && (
          <div className="upload-files">
            {fileStates.map((s, i) => (
              <FileRow
                key={i}
                name={s.name}
                progress={s.progress}
                status={s.status}
                error={s.error}
              />
            ))}
          </div>
        )}

        <div className="upload-actions">
          <button className="btn-text" onClick={onClose} disabled={uploading}>
            Cancel
          </button>
          <button
            className="btn-primary"
            onClick={handleUpload}
            disabled={!files.length || uploading}
          >
            {uploading ? 'Uploading…' : 'Upload'}
          </button>
        </div>
      </div>
    </div>
  );
}
