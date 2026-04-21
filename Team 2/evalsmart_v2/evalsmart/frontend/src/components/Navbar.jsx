import { api } from "../lib/api";

const ROLE_COLOR = { admin: "#7c3aed", teacher: "#2563eb", student: "#16a34a" };
const ROLE_LABEL = { admin: "Admin", teacher: "Teacher", student: "Student" };

export default function Navbar({ user, onLogout }) {
  async function handleLogout() {
    await api.logout().catch(() => {});
    localStorage.removeItem("evalsmart_token");
    onLogout();
  }

  return (
    <header className="h-[64px] bg-white border-b border-border flex items-center justify-between px-6 md:px-8 sticky top-0 z-50 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-primary text-white flex items-center justify-center text-sm font-bold shadow-sm">
          🎓
        </div>
        <span className="font-display font-bold text-lg tracking-tight text-text">
          EvalSmart
        </span>
      </div>

      <div className="flex items-center gap-5">
        <div className="text-right hidden sm:block">
          <div className="text-sm font-bold text-text leading-tight">{user.name}</div>
          <div className="text-[10px] font-bold uppercase tracking-widest mt-0.5"
            style={{ color: ROLE_COLOR[user.role] }}
          >
            {ROLE_LABEL[user.role]}
          </div>
        </div>
        
        <div className="h-8 w-px bg-border hidden sm:block"></div>
        
        <button
          onClick={handleLogout}
          className="px-4 py-1.5 rounded-lg border border-border text-xs font-semibold text-text hover:bg-surface hover:border-gray-300 transition-colors bg-white"
        >
          Sign out
        </button>
      </div>
    </header>
  );
}
