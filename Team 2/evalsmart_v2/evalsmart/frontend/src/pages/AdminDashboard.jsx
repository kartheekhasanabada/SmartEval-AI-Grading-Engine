import { useState, useEffect } from "react";
import { api } from "../lib/api";
import { StatCard } from "../components/ScoreBar";
import { Users, FileText, AlertCircle } from "lucide-react";

const ROLE_COLOR = { admin: "#7c3aed", teacher: "#2563eb", student: "#16a34a" };

export default function AdminDashboard({ user }) {
  const [users, setUsers] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([api.adminUsers(), api.sessions()])
      .then(([u, s]) => { setUsers(u); setSessions(s); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  const roleCounts = users.reduce((a, u) => { a[u.role] = (a[u.role]||0)+1; return a; }, {});

  if (loading) return (
    <div className="flex items-center justify-center h-[60vh]">
      <div className="spinner w-8 h-8" />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="mb-10">
        <h1 className="font-display text-3xl font-bold tracking-tight text-text mb-2">
          Admin Panel
        </h1>
        <p className="text-muted text-sm">System overview, user management, and execution logs</p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
        <StatCard label="Total Users" value={users.length} />
        <StatCard label="Teachers" value={roleCounts.teacher||0} accent="#2563eb" />
        <StatCard label="Students" value={roleCounts.student||0} accent="#16a34a" />
        <StatCard label="Pipeline Executions" value={sessions.length} accent="#d97706" />
      </div>

      <div className="grid md:grid-cols-2 gap-8">
        {/* Users table */}
        <div className="glass-card flex flex-col h-full">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-surface/30">
            <Users size={18} className="text-muted" />
            <h3 className="font-display font-bold">Registered Users</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            <table className="w-full">
              <thead className="bg-surface">
                <tr>
                  {["Name","Username","Role"].map(h => (
                    <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {users.map(u => (
                  <tr key={u.username} className="hover:bg-surface/30">
                    <td className="py-3 px-5 text-sm font-medium">{u.name}</td>
                    <td className="py-3 px-5">
                      <span className="font-mono text-xs text-muted">{u.username}</span>
                    </td>
                    <td className="py-3 px-5">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-widest border"
                        style={{
                          backgroundColor: `${ROLE_COLOR[u.role]}15`,
                          color: ROLE_COLOR[u.role],
                          borderColor: `${ROLE_COLOR[u.role]}30`
                        }}
                      >{u.role}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Sessions table */}
        <div className="glass-card flex flex-col h-full">
          <div className="px-6 py-4 border-b border-border flex items-center gap-2 bg-surface/30">
            <FileText size={18} className="text-muted" />
            <h3 className="font-display font-bold">Pipeline Executions</h3>
          </div>
          <div className="flex-1 overflow-x-auto">
            {sessions.length === 0 ? (
              <div className="p-10 text-center text-sm text-muted">
                No pipeline executions yet. Teachers need to upload files via Upload Center.
              </div>
            ) : (
              <table className="w-full">
                <thead className="bg-surface">
                  <tr>
                    {["Pipeline Upload File","Executed By","Students"].map(h => (
                      <th key={h} className="text-left py-3 px-5 text-xs font-semibold text-muted uppercase tracking-wider">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {sessions.map(s => (
                    <tr key={s.session_id} className="hover:bg-surface/30">
                      <td className="py-3 px-5">
                        <div className="text-sm font-medium max-w-[150px] truncate text-primary hover:underline cursor-pointer">
                          {s.filename}
                        </div>
                      </td>
                      <td className="py-3 px-5 text-sm text-muted">{s.uploaded_by}</td>
                      <td className="py-3 px-5">
                        <span className="font-mono text-sm font-bold">{s.student_count}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>

      <div className="mt-8 p-4 bg-primary/5 rounded-xl border border-primary/10 flex items-start gap-4">
        <AlertCircle className="text-primary shrink-0 mt-0.5" size={20} />
        <div className="text-sm text-muted">
          <strong className="text-primary block font-semibold mb-1">Architecture Note</strong>
          This system orchestrates the OCR (<code className="font-mono text-xs">neww</code>) and BERT Evaluation (<code className="font-mono text-xs">smart_eval_v2</code>) cleanly via <code className="font-mono text-xs">app.py</code> and filesystem handoffs locally. For production, results from pipeline execution should be committed to a persistent DB layer.
        </div>
      </div>
    </div>
  );
}
