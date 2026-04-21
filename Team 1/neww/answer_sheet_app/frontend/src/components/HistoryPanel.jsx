import React from 'react';

export default function HistoryPanel({ history, onSelect }) {
  if (!history || history.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={styles.emptyIcon}>⟳</span>
        <p style={styles.emptyTitle}>No history yet</p>
        <p style={styles.emptySub}>Results will appear here after you process answer sheets.</p>
      </div>
    );
  }

  return (
    <div style={styles.wrapper}>
      <div style={styles.header}>
        <h2 style={styles.title}>Result History</h2>
        <span style={styles.count}>{history.length} record{history.length !== 1 ? 's' : ''}</span>
      </div>

      <div style={styles.grid}>
        {history.map((item, i) => (
          <HistoryCard key={i} item={item} index={i} onSelect={onSelect} />
        ))}
      </div>
    </div>
  );
}

function HistoryCard({ item, index, onSelect }) {
  const student  = item?.student || {};
  const mode     = item?.pipeline_mode || 'unknown';
  const conf     = item?.crnn_mean_confidence ?? 0;
  const answers  = item?.answers || [];
  const ts       = item?.timestamp || '';
  const filename = item?.original_filename || item?.input_image || 'unknown';

  const modeColor = mode === 'crnn_local' ? 'var(--green)' : 'var(--purple)';
  const modeLabel = mode === 'crnn_local' ? 'CRNN' : 'AI Vision';
  const confPct   = Math.round(conf * 100);
  const confColor = conf >= 0.65 ? 'var(--green)' : conf >= 0.4 ? 'var(--yellow)' : 'var(--red)';

  return (
    <div
      style={{
        ...styles.card,
        animationDelay: `${index * 0.05}s`,
      }}
      onClick={() => onSelect(item)}
    >
      {/* Card header */}
      <div style={styles.cardHead}>
        <div style={styles.avatar}>
          {(student?.name || 'U')[0].toUpperCase()}
        </div>
        <div style={styles.cardMeta}>
          <div style={styles.cardName}>{student?.name || 'Unknown'}</div>
          <div style={styles.cardRoll}>{student?.roll_no || '—'}</div>
        </div>
        <div style={{ ...styles.modePill, color: modeColor, borderColor: modeColor }}>
          {modeLabel}
        </div>
      </div>

      {/* Stats row */}
      <div style={styles.statsRow}>
        <div style={styles.stat}>
          <span style={styles.statNum}>{answers.length}</span>
          <span style={styles.statLbl}>answers</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <span style={{ ...styles.statNum, color: confColor }}>{confPct}%</span>
          <span style={styles.statLbl}>conf</span>
        </div>
        <div style={styles.divider} />
        <div style={styles.stat}>
          <span style={styles.statNum}>{item?.lines_detected ?? '—'}</span>
          <span style={styles.statLbl}>lines</span>
        </div>
      </div>

      {/* Footer */}
      <div style={styles.cardFooter}>
        <span style={styles.filename}>{filename.length > 28 ? filename.slice(0, 25) + '…' : filename}</span>
        <span style={styles.timestamp}>{ts.replace('T', ' ')}</span>
      </div>

      {/* Hover arrow */}
      <div style={styles.viewHint}>View →</div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  title: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 22,
    color: 'var(--text-primary)',
  },
  count: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 10,
    padding: '2px 10px',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: 16,
  },
  card: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '18px 20px',
    cursor: 'pointer',
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
    transition: 'border-color 0.15s, box-shadow 0.15s, transform 0.15s',
    animation: 'fadeUp 0.35s ease forwards',
    opacity: 0,
    position: 'relative',
    overflow: 'hidden',
  },
  cardHead: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 38,
    height: 38,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 15,
    color: '#fff',
    flexShrink: 0,
  },
  cardMeta: {
    flex: 1,
    minWidth: 0,
  },
  cardName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 14,
    color: 'var(--text-primary)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  cardRoll: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-muted)',
  },
  modePill: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    border: '1px solid',
    borderRadius: 10,
    padding: '2px 8px',
    flexShrink: 0,
    letterSpacing: '0.06em',
  },
  statsRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 0,
    background: 'var(--bg-elevated)',
    borderRadius: 8,
    padding: '10px 0',
  },
  stat: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  statNum: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 18,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  statLbl: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    letterSpacing: '0.08em',
    textTransform: 'uppercase',
  },
  divider: {
    width: 1,
    height: 28,
    background: 'var(--border)',
  },
  cardFooter: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTop: '1px solid var(--border)',
  },
  filename: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  timestamp: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
  },
  viewHint: {
    position: 'absolute',
    bottom: 14,
    right: 16,
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--accent)',
    opacity: 0,
    transition: 'opacity 0.15s',
    pointerEvents: 'none',
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 400,
    textAlign: 'center',
  },
  emptyIcon: {
    fontSize: 48,
    color: 'var(--border-light)',
  },
  emptyTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-secondary)',
  },
  emptySub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-muted)',
    maxWidth: 320,
    lineHeight: 1.7,
  },
};
