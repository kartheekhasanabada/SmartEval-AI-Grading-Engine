export function ScoreBar({ value, max = 1, color = "var(--primary)", height = 6 }) {
  const pct = Math.min(Math.max(value / max, 0), 1) * 100;
  return (
    <div style={{ background: "#e2e8f0", borderRadius: "99px", height, overflow: "hidden", flex: 1 }}>
      <div style={{
        width: `${pct}%`, height: "100%",
        background: color, borderRadius: "99px",
        transition: "width 0.6s cubic-bezier(.4,0,.2,1)",
      }} />
    </div>
  );
}

export function GradeBadge({ grade }) {
  const colors = {
    "A+": { bg: "#dcfce7", text: "#16a34a" },
    "A":  { bg: "#dcfce7", text: "#15803d" },
    "B":  { bg: "#dbeafe", text: "#2563eb" },
    "C":  { bg: "#fef3c7", text: "#d97706" },
    "D":  { bg: "#fee2e2", text: "#ef4444" },
    "F":  { bg: "#fee2e2", text: "#dc2626" },
  };
  const c = colors[grade] || colors["F"];
  return (
    <span style={{
      padding: "3px 12px", borderRadius: "99px", fontSize: "12px", fontWeight: 700,
      background: c.bg, color: c.text, fontFamily: "var(--display)",
    }}>{grade}</span>
  );
}

export function StatCard({ label, value, sub, accent }) {
  return (
    <div className="glass-card p-5">
      <div className="text-xs text-muted font-semibold mb-2 uppercase tracking-wide">
        {label}
      </div>
      <div className="text-3xl font-bold font-display" style={{ color: accent || "inherit" }}>
        {value}
      </div>
      {sub && <div className="text-xs text-muted mt-1">{sub}</div>}
    </div>
  );
}
