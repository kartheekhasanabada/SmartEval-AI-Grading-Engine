import { useState } from "react";
import { api } from "../lib/api";

export default function LoginPage({ onLogin }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError(""); setLoading(true);
    try {
      const data = await api.login(username, password);
      localStorage.setItem("evalsmart_token", data.token);
      onLogin(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  const demoUsers = [
    { label: "Admin", u: "admin", p: "admin123", color: "#7c3aed" },
    { label: "Teacher", u: "teacher1", p: "teach123", color: "#2563eb" },
    { label: "Student", u: "student1", p: "stud123", color: "#16a34a" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center bg-surface relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute -top-[20%] -left-[10%] w-[600px] h-[600px] rounded-full opacity-60 pointer-events-none mix-blend-multiply filter blur-3xl animate-blob" style={{ background: "radial-gradient(circle, rgba(37,99,235,0.15) 0%, transparent 70%)" }} />
      <div className="absolute -bottom-[20%] -right-[10%] w-[500px] h-[500px] rounded-full opacity-60 pointer-events-none mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000" style={{ background: "radial-gradient(circle, rgba(22,163,74,0.15) 0%, transparent 70%)" }} />

      <div className="fade-in w-full max-w-[420px] p-6 z-10">
        {/* Logo */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-primary text-white shadow-lg shadow-primary/30 mb-4 text-2xl font-bold font-display">
            🎓
          </div>
          <h1 className="font-display text-3xl font-extrabold tracking-tight text-text mb-1">
            EvalSmart
          </h1>
          <p className="text-muted text-sm font-medium">
            AI-Powered Answer Sheet Evaluation
          </p>
        </div>

        {/* Card */}
        <div className="glass-card p-8 shadow-xl shadow-slate-200/50 block">
          <h2 className="font-display text-xl font-bold mb-6 text-text">
            Sign in to your account
          </h2>

          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="block text-sm text-muted mb-1.5 font-semibold">
                Username
              </label>
              <input
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Enter username"
                required
                className="w-full px-4 py-2.5 bg-white border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans placeholder-slate-400"
              />
            </div>

            <div className="mb-6">
              <label className="block text-sm text-muted mb-1.5 font-semibold">
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="Enter password"
                required
                className="w-full px-4 py-2.5 bg-white border border-border rounded-lg text-text text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary/20 transition-all font-sans placeholder-slate-400"
              />
            </div>

            {error && (
              <div className="px-4 py-2.5 rounded-lg bg-red-50 border border-red-100 text-danger text-sm mb-4 font-medium flex items-center justify-center">
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 bg-primary hover:bg-blue-700 rounded-xl text-white text-sm font-bold font-sans tracking-wide flex items-center justify-center gap-2 transition-all shadow shadow-primary/20 hover:shadow-md hover:shadow-primary/30 ${loading ? 'opacity-70 cursor-not-allowed' : 'active:scale-[0.98]'}`}
            >
              {loading && <div className="spinner w-4 h-4 border-t-white" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          {/* Demo quick-login */}
          <div className="mt-8 pt-5 border-t border-border">
            <p className="text-xs text-muted mb-3 text-center font-medium uppercase tracking-wider">
              Quick demo login
            </p>
            <div className="flex gap-2">
              {demoUsers.map(u => (
                <button
                  key={u.label}
                  onClick={() => { setUsername(u.u); setPassword(u.p); }}
                  className="flex-1 py-1.5 rounded-md border text-xs font-bold font-display transition-colors bg-white hover:bg-gray-50"
                  style={{ color: u.color, borderColor: `${u.color}30` }}
                >
                  {u.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
