import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { ScoreBar, GradeBadge, StatCard } from "../components/ScoreBar";
import { AlertCircle, FileText, CheckCircle2 } from "lucide-react";

function ScoreRow({ label, value, color }) {
  return (
    <div className="flex items-center gap-4 mb-3">
      <div className="w-24 text-xs font-semibold text-muted uppercase tracking-wider shrink-0">{label}</div>
      <ScoreBar value={value} max={1} color={color} height={6} />
      <span className="font-mono text-xs font-bold w-12 text-right" style={{ color }}>
        {(value * 100).toFixed(0)}%
      </span>
    </div>
  );
}

export default function StudentDashboard({ user }) {
  const [sessions, setSessions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    api.sessions()
      .then(data => { setSessions(data); setLoading(false); })
      .catch(e => { setError(e.message); setLoading(false); });
  }, []);

  async function loadResults(sid) {
    setSelected(sid);
    setResults(null);
    try {
      const data = await api.results(sid);
      const myData = data.students?.[0] || Object.values(data.results || {})[0];
      setResults(myData);
    } catch (e) {
      setError(e.message);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="spinner w-8 h-8" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="mb-10 flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight text-text mb-2">
            Hello, {user.name} 👋
          </h1>
          <p className="text-muted flex items-center gap-3">
            Roll No: <span className="font-mono font-bold text-primary">{user.roll_no}</span>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-success/10 text-success border border-success/20 uppercase tracking-widest">
              Read Only
            </span>
          </p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-danger rounded-lg border border-red-100 flex items-center gap-2 mb-8 text-sm font-medium">
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {sessions.length === 0 ? (
        <div className="glass-card text-center p-16">
          <FileText className="mx-auto text-muted mb-4 opacity-50" size={48} />
          <h3 className="font-display text-xl font-bold text-text mb-2">No results yet</h3>
          <p className="text-muted text-sm">Your teacher hasn't published any exam results yet.</p>
        </div>
      ) : (
        <div className="grid gap-6">
          {sessions.length > 1 && (
            <div className="glass-card p-5">
              <div className="text-xs font-semibold text-muted mb-3 uppercase tracking-wider">Select Exam Session</div>
              <div className="flex flex-wrap gap-2">
                {sessions.map(s => (
                  <button
                    key={s.session_id}
                    onClick={() => loadResults(s.session_id)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                      selected === s.session_id 
                        ? "bg-primary text-white shadow-md border border-primary" 
                        : "bg-surface text-text hover:bg-gray-100 border border-border"
                    }`}
                  >
                    {s.filename}
                  </button>
                ))}
              </div>
            </div>
          )}

          {sessions.length === 1 && !selected && (() => { loadResults(sessions[0].session_id); return null; })()}

          {results ? (
            <div className="fade-in animate-fade-in">
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
                <StatCard label="Total Marks" value={`${results.summary.total_marks}/${results.summary.total_max_marks}`} accent="var(--primary)" />
                <StatCard label="Percentage" value={`${results.summary.percentage}%`} accent="var(--primary)" />
                <div className="glass-card p-5 flex flex-col justify-center items-start gap-2">
                  <div className="text-xs font-semibold text-muted uppercase tracking-widest mb-1">Grade Final</div>
                  <div className="scale-125 origin-left">
                    <GradeBadge grade={results.summary.grade} />
                  </div>
                </div>
              </div>

              <h3 className="font-display text-xl font-bold tracking-tight mb-4 flex items-center gap-2">
                <CheckCircle2 className="text-primary" size={20} /> Evaluated Answers
              </h3>
              
              <div className="space-y-4">
                {results.questions.map((q, i) => (
                  <div key={i} className="glass-card p-6 border-l-4" style={{ 
                    borderLeftColor: q.final_score >= 0.7 ? '#16a34a' : q.final_score >= 0.4 ? '#d97706' : '#dc2626'
                  }}>
                    <div className="flex justify-between items-start mb-4">
                      <span className="font-mono text-xs font-bold text-primary bg-primary/10 px-3 py-1 rounded-md border border-primary/20">
                        {q.q_id}
                      </span>
                      <div className="text-right">
                        <span className="font-mono text-2xl font-bold text-text">{q.marks_awarded}</span>
                        <span className="font-mono text-muted text-sm border-l border-border ml-1 pl-1">/{q.max_marks}</span>
                      </div>
                    </div>

                    <div className={`p-4 rounded-xl mb-6 text-sm leading-relaxed border ${
                      q.student_answer ? "bg-surface border-transparent text-text" : "bg-gray-50 border-gray-200 text-muted italic"
                    }`}>
                      {q.student_answer || "No answer provided"}
                    </div>

                    <div className="p-4 rounded-xl bg-surface/50 border border-border">
                      <ScoreRow label="Cosine" value={q.cosine_score} color="#2563eb" />
                      <ScoreRow label="Keyword" value={q.keyword_score} color="#2563eb" />
                      <div className="h-px bg-border my-3"></div>
                      <ScoreRow label="Final" value={q.final_score}
                        color={q.final_score>=0.7?"#16a34a":q.final_score>=0.4?"#d97706":"#dc2626"} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : selected ? (
            <div className="flex justify-center p-12">
              <div className="spinner w-8 h-8" />
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}
