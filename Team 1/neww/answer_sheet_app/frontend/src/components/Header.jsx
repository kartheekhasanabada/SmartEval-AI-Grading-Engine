import React from 'react';

export default function Header({ activeView, onNavChange, historyCount }) {
  const navItems = [
    { id: 'upload',  label: 'Upload',  icon: '⬆' },
    { id: 'results', label: 'Results', icon: '◈' },
    { id: 'history', label: 'History', icon: '⟳', badge: historyCount },
  ];

  return (
    <header style={styles.header}>
      <div style={styles.inner}>
        {/* Logo */}
        <div style={styles.logo}>
          <div style={styles.logoIcon}>
            <span style={styles.logoInner}>AI</span>
          </div>
          <div>
            <div style={styles.logoTitle}>AnswerScan</div>
            <div style={styles.logoSub}>Hybrid OCR Pipeline</div>
          </div>
        </div>

        {/* Nav */}
        <nav style={styles.nav}>
          {navItems.map(item => (
            <button
              key={item.id}
              style={{
                ...styles.navBtn,
                ...(activeView === item.id ? styles.navBtnActive : {}),
              }}
              onClick={() => onNavChange(item.id)}
            >
              <span style={styles.navIcon}>{item.icon}</span>
              <span>{item.label}</span>
              {item.badge > 0 && (
                <span style={styles.badge}>{item.badge}</span>
              )}
            </button>
          ))}
        </nav>

        {/* Status chip */}
        <div style={styles.statusChip}>
          <span style={styles.dot} />
          <span style={styles.statusText}>CRNN + Gemini</span>
        </div>
      </div>
    </header>
  );
}

const styles = {
  header: {
    borderBottom: '1px solid var(--border)',
    background: '#ffffff',
    position: 'sticky',
    top: 0,
    zIndex: 100,
    boxShadow: '0 1px 3px rgba(0,0,0,0.06)',
  },
  inner: {
    maxWidth: 1200,
    margin: '0 auto',
    padding: '0 24px',
    height: 64,
    display: 'flex',
    alignItems: 'center',
    gap: 32,
  },
  logo: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  logoIcon: {
    width: 36,
    height: 36,
    borderRadius: 8,
    background: 'linear-gradient(135deg, #1e40af, #2563eb)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
  },
  logoInner: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 12,
    color: '#fff',
    letterSpacing: '0.05em',
  },
  logoTitle: {
    fontFamily: 'var(--font-display)',
    fontWeight: 700,
    fontSize: 16,
    color: 'var(--text-primary)',
    lineHeight: 1.2,
  },
  logoSub: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
    letterSpacing: '0.05em',
  },
  nav: {
    display: 'flex',
    gap: 4,
    marginLeft: 'auto',
  },
  navBtn: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '6px 14px',
    background: 'transparent',
    border: '1px solid transparent',
    borderRadius: 'var(--radius-sm)',
    color: 'var(--text-muted)',
    fontFamily: 'var(--font-mono)',
    fontSize: 12,
    cursor: 'pointer',
    transition: 'all 0.15s',
  },
  navBtnActive: {
    background: 'var(--accent-dim)',
    border: '1px solid var(--accent)',
    color: 'var(--accent)',
  },
  navIcon: {
    fontSize: 14,
  },
  badge: {
    background: 'var(--accent)',
    color: '#fff',
    borderRadius: 10,
    fontSize: 10,
    padding: '1px 6px',
    lineHeight: 1.6,
    fontWeight: 700,
  },
  statusChip: {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '4px 12px',
    background: 'rgba(22,163,74,0.07)',
    border: '1px solid rgba(22,163,74,0.25)',
    borderRadius: 20,
    marginLeft: 8,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: '50%',
    background: 'var(--green)',
    boxShadow: '0 0 5px var(--green)',
    animation: 'blink 2.4s ease-in-out infinite',
    display: 'inline-block',
  },
  statusText: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--green)',
    letterSpacing: '0.08em',
  },
};
