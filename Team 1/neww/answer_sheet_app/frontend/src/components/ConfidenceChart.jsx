import React from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, ResponsiveContainer, Cell
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const val = payload[0].value;
    const color = val >= 0.65 ? '#22c55e' : val >= 0.4 ? '#eab308' : '#ef4444';
    return (
      <div style={{
        background: '#0d1422',
        border: '1px solid #1e2d45',
        borderRadius: 8,
        padding: '10px 14px',
        fontFamily: 'Space Mono, monospace',
        fontSize: 12,
      }}>
        <div style={{ color: '#7e99c8', marginBottom: 4 }}>Line {label}</div>
        <div style={{ color, fontWeight: 700 }}>{Math.round(val * 100)}% confidence</div>
        {payload[0].payload?.text && (
          <div style={{ color: '#3d5580', marginTop: 6, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            "{payload[0].payload.text}"
          </div>
        )}
      </div>
    );
  }
  return null;
};

export default function ConfidenceChart({ lineData, mean, threshold }) {
  if (!lineData || lineData.length === 0) {
    return (
      <div style={styles.empty}>
        <span style={{ fontSize: 32 }}>◫</span>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>No per-line confidence data available.</p>
        <p style={{ color: 'var(--text-muted)', fontSize: 11 }}>This is shown when Gemini fallback is the primary source.</p>
      </div>
    );
  }

  const data = lineData.map(d => ({
    name: `L${d.line}`,
    confidence: d.confidence,
    text: d.text,
  }));

  return (
    <div style={styles.wrapper}>
      {/* Summary row */}
      <div style={styles.summary}>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Mean Confidence</div>
          <div style={{ ...styles.summaryVal, color: mean >= threshold ? 'var(--green)' : 'var(--yellow)' }}>
            {Math.round(mean * 100)}%
          </div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Threshold</div>
          <div style={{ ...styles.summaryVal, color: 'var(--text-secondary)' }}>
            {Math.round(threshold * 100)}%
          </div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Lines Passed</div>
          <div style={{ ...styles.summaryVal, color: 'var(--accent-bright)' }}>
            {lineData.filter(d => d.confidence >= threshold).length} / {lineData.length}
          </div>
        </div>
        <div style={styles.summaryItem}>
          <div style={styles.summaryLabel}>Low Conf (→ Gemini)</div>
          <div style={{ ...styles.summaryVal, color: 'var(--purple)' }}>
            {lineData.filter(d => d.confidence < threshold).length}
          </div>
        </div>
      </div>

      {/* Bar chart */}
      <div style={styles.chartWrap}>
        <div style={styles.chartTitle}>Per-Line CRNN Confidence</div>
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={data} margin={{ top: 16, right: 24, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2d45" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fontFamily: 'Space Mono, monospace', fontSize: 11, fill: '#3d5580' }}
              axisLine={{ stroke: '#1e2d45' }}
              tickLine={false}
            />
            <YAxis
              domain={[0, 1]}
              tickFormatter={v => `${Math.round(v * 100)}%`}
              tick={{ fontFamily: 'Space Mono, monospace', fontSize: 10, fill: '#3d5580' }}
              axisLine={false}
              tickLine={false}
              width={44}
            />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(59,130,246,0.06)' }} />
            <ReferenceLine
              y={threshold}
              stroke="#7c3aed"
              strokeDasharray="5 3"
              strokeWidth={1.5}
              label={{
                value: `Threshold (${Math.round(threshold * 100)}%)`,
                fill: '#7e99c8',
                fontFamily: 'Space Mono, monospace',
                fontSize: 10,
                position: 'insideTopRight',
              }}
            />
            <Bar dataKey="confidence" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {data.map((entry, index) => {
                const c = entry.confidence;
                const color = c >= threshold ? '#22c55e' : c >= 0.4 ? '#eab308' : '#ef4444';
                return <Cell key={index} fill={color} fillOpacity={0.85} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div style={styles.legend}>
        {[
          { color: '#22c55e', label: `Above threshold (≥${Math.round(threshold*100)}%) — CRNN accepted` },
          { color: '#eab308', label: 'Medium confidence (40–65%)' },
          { color: '#ef4444', label: 'Low confidence (<40%) — Gemini fallback' },
          { color: '#7c3aed', label: 'Threshold line', dashed: true },
        ].map(item => (
          <div key={item.label} style={styles.legendItem}>
            <div style={{
              ...styles.legendDot,
              background: item.color,
              ...(item.dashed ? { width: 16, height: 2, borderRadius: 1 } : {}),
            }} />
            <span style={styles.legendLabel}>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const styles = {
  wrapper: {
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
    paddingTop: 20,
  },
  empty: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    minHeight: 240,
    color: 'var(--text-muted)',
    textAlign: 'center',
  },
  summary: {
    display: 'grid',
    gridTemplateColumns: 'repeat(4, 1fr)',
    gap: 12,
  },
  summaryItem: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '14px 16px',
    textAlign: 'center',
  },
  summaryLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 9,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  summaryVal: {
    fontFamily: 'var(--font-display)',
    fontWeight: 800,
    fontSize: 22,
  },
  chartWrap: {
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
    padding: '20px 16px 12px',
  },
  chartTitle: {
    fontFamily: 'var(--font-mono)',
    fontSize: 10,
    color: 'var(--text-muted)',
    letterSpacing: '0.1em',
    textTransform: 'uppercase',
    marginBottom: 8,
    paddingLeft: 4,
  },
  legend: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: '8px 20px',
    padding: '12px 16px',
    background: 'var(--bg-card)',
    border: '1px solid var(--border)',
    borderRadius: 'var(--radius-md)',
  },
  legendItem: {
    display: 'flex',
    alignItems: 'center',
    gap: 8,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: '50%',
    flexShrink: 0,
  },
  legendLabel: {
    fontFamily: 'var(--font-mono)',
    fontSize: 11,
    color: 'var(--text-secondary)',
  },
};
