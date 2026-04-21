import { useState, useEffect } from "react";
import { api } from "./lib/api";
import LoginPage from "./pages/LoginPage";
import TeacherDashboard from "./pages/TeacherDashboard";
import StudentDashboard from "./pages/StudentDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Navbar from "./components/Navbar";

export default function App() {
  const [user, setUser] = useState(null);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("evalsmart_token");
    if (!token) { setChecking(false); return; }
    api.me()
      .then(u => { setUser(u); setChecking(false); })
      .catch(() => { localStorage.removeItem("evalsmart_token"); setChecking(false); });
  }, []);

  if (checking) {
    return (
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh" }}>
        <div className="spinner" style={{ width: "36px", height: "36px" }} />
      </div>
    );
  }

  if (!user) {
    return <LoginPage onLogin={u => setUser(u)} />;
  }

  const Dashboard = {
    admin:   AdminDashboard,
    teacher: TeacherDashboard,
    student: StudentDashboard,
  }[user.role] || StudentDashboard;

  return (
    <div style={{ minHeight: "100vh" }}>
      <Navbar user={user} onLogout={() => setUser(null)} />
      <Dashboard user={user} />
    </div>
  );
}
