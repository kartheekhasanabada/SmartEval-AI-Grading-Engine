import React, { useState } from 'react';

function syntaxHighlight(json) {
  const str = JSON.stringify(json, null, 2);
  return str.replace(
    /("(\\u[a-zA-Z0-9]{4}|\\[^u]|[^\\"])*"(\s*:)?|\b(true|false|null)\b|-?\d+(?:\.\d*)?(?:[eE][+\-]?\d+)?)/g,
    (match) => {
      let cls = 'json-num';
      if (/^"/.test(match)) {
        cls = /:$/.test(match) ? 'json-key' : 'json-str';
      } else if (/true|false/.test(match)) {
        cls = 'json-bool';
      } else if (/null/.test(match)) {
        cls = 'json-null';
      }
      return `<span class="${cls}">${match}</span>`;
    }
  );
}

export default function JsonViewer({ data }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `result_${data?.timestamp || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const highlighted = syntaxHighlight(data);

  return (
    <div style={styles.wrapper}>
      <div style={styles.toolbar}>
        <span style={styles.toolbarTitle}>JSON Output</span>
        <div style={styles.toolbarActions}>
          <button style={styles.toolBtn} onClick={handleCopy}>
            {copied ? '✓ Copied' : '⧉ Copy'}
          </button>
          <button style={styles.toolBtn} onClick={handleDownload}>
            ↓ Download
          </button>
        </div>
      </div>

      <style>{`
        .json-viewer-pre .json-key  { color: #1d4ed8; }
        .json-viewer-pre .json-str  { color: #15803d; }
        .json-viewer-pre .json-num  { color: #b45309; }
        .json-viewer-pre .json-bool { color: #7c3aed; }
        .json-viewer-pre .json-null { color: #9ca3af; }
      `}</style>

      <pre
        className="json-viewer-pre"
        style={styles.pre}
        dangerouslySetInnerHTML={{ __html: highlighted }}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    paddingTop: 20,
  },
  toolbar: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '10px 16px',
    background: 'var(--bg-elevated)',
    border: '1px solid var(--border)',
    borderBottom: 'none',
    borderRadius: 'var(--radius-md) var(--radius-md) 0 0',
  },
  toolbarTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
  },
  toolbarActions: {
    display: 'flex',
    gap: 8,
  },
  toolBtn: {
    padding: '4px 12px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 4,
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    cursor: 'pointer',
  },
  pre: {
    margin: 0,
    padding: '20px 24px',
    background: '#f8fafc',
    border: '1px solid var(--border)',
    borderRadius: '0 0 var(--radius-md) var(--radius-md)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    lineHeight: 1.75,
    overflowX: 'auto',
    color: 'var(--text-secondary)',
    maxHeight: 480,
    overflowY: 'auto',
    whiteSpace: 'pre',
  },
};
