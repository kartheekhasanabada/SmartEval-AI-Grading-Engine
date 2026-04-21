import React, { useState, useCallback } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import ResultPanel from './components/ResultPanel';
import HistoryPanel from './components/HistoryPanel';
import './index.css';

const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:8000';

export default function App() {
  const [status, setStatus]   = useState('idle');   // idle | uploading | processing | done | error
  const [result, setResult]   = useState(null);
  const [error, setError]     = useState('');
  const [history, setHistory] = useState([]);
  const [view, setView]       = useState('upload'); // upload | results | history

  const handleUpload = useCallback(async (file) => {
    setStatus('uploading');
    setError('');
    setResult(null);

    const form = new FormData();
    form.append('file', file);

    try {
      setStatus('processing');
      const res = await fetch(`${API_BASE}/upload`, {
        method: 'POST',
        body: form,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({ detail: 'Unknown server error' }));
        throw new Error(err.detail || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setResult(data);
      setHistory(prev => [data, ...prev.slice(0, 49)]);
      setStatus('done');
      setView('results');
    } catch (e) {
      setError(e.message);
      setStatus('error');
    }
  }, []);

  const handleReset = () => {
    setStatus('idle');
    setResult(null);
    setError('');
    setView('upload');
  };

  const loadHistoryItem = (item) => {
    setResult(item);
    setView('results');
  };

  return (
    <div style={styles.root}>
      <Header activeView={view} onNavChange={setView} historyCount={history.length} />

      <main style={styles.main}>
        {view === 'upload' && (
          <UploadZone
            status={status}
            error={error}
            onUpload={handleUpload}
            onReset={handleReset}
          />
        )}

        {view === 'results' && result && (
          <ResultPanel result={result} onBack={handleReset} />
        )}

        {view === 'results' && !result && (
          <div style={styles.empty}>
            <span style={styles.emptyIcon}>◈</span>
            <p style={styles.emptyText}>No results yet. Upload an answer sheet first.</p>
            <button style={styles.emptyBtn} onClick={() => setView('upload')}>
              Go to Upload
            </button>
          </div>
        )}

        {view === 'history' && (
          <HistoryPanel history={history} onSelect={loadHistoryItem} />
        )}
      </main>
    </div>
  );
}

const styles = {
  root: {
    minHeight: '100vh',
    display: 'flex',
    flexDirection: 'column',
    background: 'var(--bg-base)',
  },
  main: {
    flex: 1,
    maxWidth: 1200,
    width: '100%',
    margin: '0 auto',
    padding: '32px 24px 64px',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 400,
    color: 'var(--text-muted)',
  },
  emptyIcon: {
    fontSize: 48,
    color: 'var(--border-light)',
  },
  emptyText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 14,
    color: 'var(--text-secondary)',
  },
  emptyBtn: {
    marginTop: 8,
    padding: '10px 24px',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--accent-bright)',
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    cursor: 'pointer',
  },
};
