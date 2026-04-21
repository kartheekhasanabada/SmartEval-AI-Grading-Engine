import React, { useState } from 'react';
import JsonViewer from './JsonViewer';

export default function ResultPanel({ result, onBack }) {
  const [activeTab, setActiveTab] = useState('answers');

  const student = result?.student || {};
  const answers = result?.answers || [];
  const mode    = result?.pipeline_mode || '';

  const modeLabel = mode === 'crnn_local' ? 'CRNN Local' : 'Gemini Fallback';
  const modeColor = mode === 'crnn_local' ? 'var(--green)' : 'var(--purple)';

  const tabs = ['answers', 'json'];

  const downloadJSON = () => {
    const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = `result_${result.timestamp || 'export'}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div style={styles.wrapper}>
      {/* Top bar */}
      <div style={styles.topBar}>
        <button style={styles.backBtn} onClick={onBack}>
          ← New Upload
        </button>
        <span style={{ ...styles.modeBadge, borderColor: modeColor, color: modeColor }}>
          {modeLabel}
        </span>
        <button style={styles.downloadBtn} onClick={downloadJSON}>
          ↓ Download JSON
        </button>
      </div>

      {/* Student card */}
      <StudentCard student={student} lines={result?.lines_detected} timestamp={result?.timestamp} />

      {/* Tabs */}
      <div style={styles.tabs}>
        {tabs.map(t => (
          <button
            key={t}
            style={{ ...styles.tab, ...(activeTab === t ? styles.tabActive : {}) }}
            onClick={() => setActiveTab(t)}
          >
            {t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div style={styles.tabContent}>
        {activeTab === 'answers' && <AnswersTab answers={answers} mode={mode} />}
        {activeTab === 'json'    && <JsonViewer data={result} />}
      </div>
    </div>
  );
}

function StudentCard({ student, lines, timestamp }) {
  const fields = [
    { label: 'NAME',    value: student?.name    || '—' },
    { label: 'ROLL NO', value: student?.roll_no || '—' },
    { label: 'SUBJECT', value: student?.subject || '—' },
    { label: 'LINES',   value: lines ?? '—' },
    { label: 'TIME',    value: timestamp ? timestamp.replace('T', ' ') : '—' },
  ];

  return (
    <div style={styles.studentCard}>
      <div style={styles.studentHeader}>
        <div style={styles.avatarCircle}>
          {(student?.name || 'U')[0].toUpperCase()}
        </div>
        <div>
          <div style={styles.studentName}>{student?.name || 'Unknown Student'}</div>
          <div style={styles.studentRoll}>{student?.roll_no || 'No roll number'}</div>
        </div>
      </div>
      <div style={styles.studentGrid}>
        {fields.map(f => (
          <div key={f.label} style={styles.fieldItem}>
            <div style={styles.fieldLabel}>{f.label}</div>
            <div style={styles.fieldValue}>{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AnswersTab({ answers, mode }) {
  if (!answers?.length) {
    return (
      <div style={styles.emptyAnswers}>
        <span style={{ fontSize: 32, color: 'var(--text-muted)' }}>◫</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No answers extracted from this sheet.</p>
      </div>
    );
  }

  return (
    <div style={styles.answersWrap}>
      {answers.map((a, i) => {
        const conf    = a.confidence ?? null;
        const confPct = conf !== null ? Math.round(conf * 100) : null;
        const badgeColor = conf === null
          ? 'var(--purple)'
          : conf >= 0.65 ? 'var(--green)' : conf >= 0.4 ? 'var(--yellow)' : 'var(--red)';

        return (
          <div key={i} style={{ ...styles.answerCard, animationDelay: `${i * 0.05}s` }}>
            <div style={styles.answerHeader}>
              <div style={styles.qNumber}>Q{a.q}</div>
              {confPct !== null && (
                <div style={{ ...styles.confBadge2, color: badgeColor, borderColor: badgeColor }}>
                  {confPct}% conf
                </div>
              )}
              {conf === null && (
                <div style={{ ...styles.confBadge2, color: 'var(--purple)', borderColor: 'var(--purple)' }}>
                  AI
                </div>
              )}
            </div>
            <div style={styles.answerText}>{a.text}</div>
          </div>
        );
      })}
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    animation: 'fadeUp 0.4s ease',
  },
  topBar: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  backBtn: {
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-secondary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer',
  },
  modeBadge: {
    padding: '4px 12px',
    background: 'transparent',
    border: '1px solid',
    borderRadius: 20,
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    letterSpacing: '0.06em',
  },
  downloadBtn: {
    padding: '7px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-primary)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer',
    marginLeft: 'auto',
    boxShadow: 'var(--shadow-card)',
  },
  studentCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-lg)',
    padding: '20px 24px',
    boxShadow: 'var(--shadow-card)',
  },
  studentHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    marginBottom: 20,
    paddingBottom: 16,
    borderBottom: '1px solid var(--border)',
  },
  avatarCircle: {
    width: 48,
    height: 48,
    borderRadius: '50%',
    background: 'linear-gradient(135deg, #1e40af, #7c3aed)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 20,
    color: '#fff',
    flexShrink: 0,
    boxShadow: '0 4px 12px rgba(37,99,235,0.25)',
  },
  studentName: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 18,
    color: 'var(--text-primary)',
  },
  studentRoll: {
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    color: 'var(--text-muted)',
    marginTop: 2,
  },
  studentGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
    gap: 16,
  },
  fieldItem: {},
  fieldLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    marginBottom: 3,
  },
  fieldValue: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--text-primary)',
    wordBreak: 'break-all',
  },
  tabs: {
    display: 'flex',
    gap: 4,
    borderBottom: '2px solid var(--border)',
  },
  tab: {
    padding: '8px 20px',
    background: 'transparent',
    border: 'none',
    borderBottom: '2px solid transparent',
    marginBottom: -2,
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    transition: 'color 0.15s',
  },
  tabActive: {
    color: 'var(--accent)',
    borderBottom: '2px solid var(--accent)',
  },
  tabContent: {
    minHeight: 280,
  },
  answersWrap: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
    paddingTop: 20,
  },
  answerCard: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '16px 20px',
    boxShadow: 'var(--shadow-card)',
    animation: 'fadeUp 0.3s ease forwards',
    opacity: 0,
  },
  answerHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  qNumber: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 13,
    color: 'var(--accent)',
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent)',
    borderRadius: 4,
    padding: '2px 8px',
  },
  confBadge2: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    border: '1px solid',
    borderRadius: 10,
    padding: '1px 8px',
    letterSpacing: '0.05em',
  },
  answerText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 13,
    color: 'var(--text-secondary)',
    lineHeight: 1.8,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
  },
  emptyAnswers: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 200,
    color: 'var(--text-muted)',
  },
};
