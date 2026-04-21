import React, { useState, useRef, useCallback } from 'react';

const ACCEPTED = ['image/png', 'image/jpeg', 'image/jpg', 'application/pdf'];

export default function UploadZone({ status, error, onUpload, onReset }) {
  const [dragOver, setDragOver] = useState(false);
  const [preview, setPreview]   = useState(null);
  const [file, setFile]         = useState(null);
  const inputRef = useRef();

  const handleFile = useCallback((f) => {
    if (!ACCEPTED.includes(f.type)) {
      alert('Unsupported file type. Please use PNG, JPG, or PDF.');
      return;
    }
    setFile(f);
    if (f.type !== 'application/pdf') {
      const url = URL.createObjectURL(f);
      setPreview(url);
    } else {
      setPreview(null);
    }
  }, []);

  const onDrop = useCallback((e) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files[0];
    if (f) handleFile(f);
  }, [handleFile]);

  const onFileInput = (e) => {
    const f = e.target.files[0];
    if (f) handleFile(f);
  };

  const handleSubmit = () => {
    if (file) onUpload(file);
  };

  const handleClear = () => {
    setFile(null);
    setPreview(null);
    if (inputRef.current) inputRef.current.value = '';
    onReset();
  };

  const isIdle       = status === 'idle';
  const isProcessing = status === 'uploading' || status === 'processing';
  const isDone       = status === 'done';
  const isError      = status === 'error';

  return (
    <div style={styles.wrapper}>
      {/* Page heading */}
      <div style={styles.pageHead}>
        <h1 style={styles.pageTitle}>Answer Sheet Digitizer</h1>
        <p style={styles.pageDesc}>
          Upload a handwritten answer sheet. The hybrid pipeline runs CRNN and 
          gives Digitized output.
        </p>
      </div>

      {/* Pipeline diagram */}
      <PipelineDiagram active={isProcessing} />

      {/* Drop zone */}
      <div
        style={{
          ...styles.dropZone,
          ...(dragOver ? styles.dropZoneOver : {}),
          ...(file && !isProcessing ? styles.dropZoneHasFile : {}),
          ...(isError ? styles.dropZoneError : {}),
        }}
        onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
        onDragLeave={() => setDragOver(false)}
        onDrop={onDrop}
        onClick={() => !file && inputRef.current?.click()}
      >
        <input
          ref={inputRef}
          type="file"
          accept=".png,.jpg,.jpeg,.pdf"
          style={{ display: 'none' }}
          onChange={onFileInput}
        />

        {!file && !isProcessing && (
          <DropPrompt />
        )}

        {file && !isProcessing && (
          <FilePreview file={file} preview={preview} onClear={handleClear} />
        )}

        {isProcessing && (
          <ProcessingIndicator status={status} />
        )}

        {isError && !isProcessing && (
          <div style={styles.errorBox}>
            <span style={styles.errorIcon}>⚠</span>
            <div>
              <div style={styles.errorTitle}>Pipeline Error</div>
              <div style={styles.errorMsg}>{error}</div>
            </div>
            <button style={styles.retryBtn} onClick={handleClear}>Retry</button>
          </div>
        )}
      </div>

      {/* Submit button */}
      {file && !isProcessing && !isDone && !isError && (
        <div style={styles.submitRow}>
          <button style={styles.submitBtn} onClick={handleSubmit}>
            <span style={styles.submitIcon}>▶</span>
            Run Hybrid Pipeline
          </button>
          <span style={styles.fileInfo}>{file.name} · {(file.size / 1024).toFixed(1)} KB</span>
        </div>
      )}
    </div>
  );
}

function DropPrompt() {
  return (
    <div style={styles.prompt}>
      <div style={styles.promptIcon}>
        <div style={styles.promptIconOuter}>
          <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/>
            <polyline points="17 8 12 3 7 8"/>
            <line x1="12" y1="3" x2="12" y2="15"/>
          </svg>
        </div>
      </div>
      <div style={styles.promptTitle}>Drop answer sheet here</div>
      <div style={styles.promptSub}>or click to browse</div>
      <div style={styles.promptFormats}>PNG · JPG · PDF</div>
    </div>
  );
}

function FilePreview({ file, preview, onClear }) {
  return (
    <div style={styles.previewWrap}>
      {preview ? (
        <img src={preview} alt="Preview" style={styles.previewImg} />
      ) : (
        <div style={styles.pdfIcon}>
          <span>PDF</span>
        </div>
      )}
      <div style={styles.previewMeta}>
        <div style={styles.previewName}>{file.name}</div>
        <div style={styles.previewSize}>{(file.size / 1024).toFixed(1)} KB</div>
      </div>
      <button style={styles.clearBtn} onClick={(e) => { e.stopPropagation(); onClear(); }}>✕</button>
    </div>
  );
}

function ProcessingIndicator({ status }) {
  const steps = [
    { key: 'uploading',   label: 'Uploading image...',        icon: '⬆' },
    { key: 'processing',  label: 'HPP Segmentation (OpenCV)', icon: '◫' },
    { key: 'processing2', label: 'CRNN OCR inference...',     icon: '⟳' },
    { key: 'processing3', label: 'Confidence Gate check...',  icon: '◈' },
    { key: 'processing4', label: 'Gemini Vision fallback...',  icon: '☁' },
  ];

  return (
    <div style={styles.processing}>
      <div style={styles.scanEffect}>
        <div style={styles.scanLine} />
      </div>
      <div style={styles.processingInner}>
        <div style={styles.spinner} />
        <div style={styles.processingTitle}>Running Pipeline</div>
        <div style={styles.processingSteps}>
          {steps.slice(0, status === 'uploading' ? 1 : 5).map((s, i) => (
            <div key={i} style={{
              ...styles.step,
              animationDelay: `${i * 0.3}s`,
              opacity: 0,
              animation: `fadeUp 0.4s ease ${i * 0.3}s forwards`,
            }}>
              <span style={styles.stepIcon}>{s.icon}</span>
              <span>{s.label}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function PipelineDiagram({ active }) {
  const nodes = [
    { label: 'Image Input',   color: '#3b82f6' },
    { label: 'OpenCV Preproc', color: '#8b5cf6' },
    { label: 'HPP Segment',   color: '#06b6d4' },
    { label: 'CRNN OCR',      color: '#f59e0b' },
    { label: 'Confidence Gate', color: '#ec4899' },
    { label: 'JSON Output',   color: '#22c55e' },
  ];

  return (
    <div style={styles.diagram}>
      {nodes.map((n, i) => (
        <React.Fragment key={i}>
          <div style={{
            ...styles.diagNode,
            borderColor: n.color,
            boxShadow: active ? `0 0 12px ${n.color}44` : 'none',
            transition: `all 0.3s ease ${i * 0.08}s`,
          }}>
            <span style={{ ...styles.diagDot, background: n.color }} />
            <span style={styles.diagLabel}>{n.label}</span>
          </div>
          {i < nodes.length - 1 && (
            <div style={{
              ...styles.diagArrow,
              background: active ? `linear-gradient(90deg, ${n.color}, ${nodes[i+1].color})` : 'var(--border)',
            }} />
          )}
        </React.Fragment>
      ))}
    </div>
  );
}

const styles = {
  wrapper: {
    maxWidth: 760,
    margin: '0 auto',
    display: 'flex',
    flexDirection: 'column',
    gap: 28,
  },
  pageHead: {
    textAlign: 'center',
    paddingTop: 8,
  },
  pageTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 32,
    color: 'var(--text-primary)',
    letterSpacing: '-0.02em',
    marginBottom: 10,
  },
  pageDesc: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--text-secondary)',
    maxWidth: 520,
    margin: '0 auto',
    lineHeight: 1.7,
  },
  diagram: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 0,
    padding: '16px 20px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    overflowX: 'auto',
  },
  diagNode: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '5px 10px',
    background: 'var(--bg-base)',
    border: '1px solid',
    borderRadius: 6,
    fontSize: 10,
    fontFamily: 'var(--font-mono)',
    color: 'var(--text-secondary)',
    whiteSpace: 'nowrap',
  },
  diagDot: {
    width: 6,
    height: 6,
    borderRadius: '50%',
    flexShrink: 0,
  },
  diagLabel: { fontSize: 10 },
  diagArrow: {
    width: 20,
    height: 1,
    flexShrink: 0,
    transition: 'background 0.3s ease',
  },
  dropZone: {
    minHeight: 260,
    border: '2px dashed var(--border-light)',
    borderRadius: 'var(--radius-lg)',
    background: 'var(--bg-card)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    position: 'relative',
    overflow: 'hidden',
  },
  dropZoneOver: {
    border: '2px dashed var(--accent)',
    background: 'var(--accent-dim)',
    boxShadow: 'var(--shadow-glow)',
  },
  dropZoneHasFile: {
    cursor: 'default',
    border: '2px dashed var(--green)',
    background: 'rgba(34,197,94,0.03)',
  },
  dropZoneError: {
    border: '2px dashed var(--red)',
    background: 'rgba(239,68,68,0.03)',
    cursor: 'default',
  },
  prompt: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 10,
    padding: 32,
    userSelect: 'none',
  },
  promptIcon: {
    marginBottom: 4,
  },
  promptIconOuter: {
    width: 64,
    height: 64,
    borderRadius: '50%',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    color: 'var(--accent-bright)',
  },
  promptTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  promptSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  promptFormats: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.12em',
    marginTop: 4,
  },
  previewWrap: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 12,
    padding: 24,
    position: 'relative',
    width: '100%',
  },
  previewImg: {
    maxHeight: 180,
    maxWidth: '100%',
    borderRadius: 8,
    objectFit: 'contain',
    border: '1px solid var(--border)',
  },
  pdfIcon: {
    width: 80,
    height: 100,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: 8,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-mono)',
    fontSize: 16,
    color: 'var(--red)',
    fontWeight: 700,
  },
  previewMeta: {
    textAlign: 'center',
  },
  previewName: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--text-primary)',
  },
  previewSize: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  clearBtn: {
    position: 'absolute',
    top: 12,
    right: 12,
    width: 28,
    height: 28,
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderRadius: '50%',
    color: 'var(--text-secondary)',
    fontSize: 12,
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  processing: {
    width: '100%',
    minHeight: 260,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  scanEffect: {
    position: 'absolute',
    inset: 0,
    overflow: 'hidden',
    borderRadius: 'inherit',
    pointerEvents: 'none',
  },
  scanLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 2,
    background: 'linear-gradient(90deg, transparent, var(--accent), transparent)',
    animation: 'scan-line 2s linear infinite',
  },
  processingInner: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 16,
  },
  spinner: {
    width: 40,
    height: 40,
    border: '3px solid var(--border)',
    borderTop: '3px solid var(--accent)',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  processingTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  processingSteps: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
    alignItems: 'flex-start',
  },
  step: {
    display: 'flex',
    gap: 8,
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-secondary)',
  },
  stepIcon: {
    color: 'var(--accent)',
  },
  submitRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 16,
  },
  submitBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
    padding: '12px 28px',
    background: 'linear-gradient(135deg, #1d4ed8, #3b82f6)',
    border: 'none',
    borderRadius: 'var(--radius-sm)',
    color: '#fff',
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    cursor: 'pointer',
    boxShadow: '0 4px 16px rgba(59,130,246,0.35)',
    transition: 'transform 0.1s, box-shadow 0.1s',
  },
  submitIcon: {
    fontSize: 16,
  },
  fileInfo: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-muted)',
  },
  errorBox: {
    display: 'flex',
    alignItems: 'flex-start',
    gap: 14,
    padding: '20px 24px',
    background: 'rgba(239,68,68,0.05)',
    border: '1px solid rgba(239,68,68,0.2)',
    borderRadius: 'var(--radius-md)',
    maxWidth: 480,
  },
  errorIcon: {
    fontSize: 24,
    color: 'var(--red)',
    flexShrink: 0,
  },
  errorTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--red)',
    marginBottom: 4,
  },
  errorMsg: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-secondary)',
    maxWidth: 340,
  },
  retryBtn: {
    marginLeft: 'auto',
    padding: '6px 14px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--red)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--red)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer',
    flexShrink: 0,
  },
};
