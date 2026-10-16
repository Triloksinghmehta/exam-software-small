import type { ReactNode } from "react";
import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider, useAuth } from "./lib/auth";
import { AdminBar } from "./components/ui";
import StudentLogin from "./pages/StudentLogin";
import ChangePassword from "./pages/ChangePassword";
import StudentHome from "./pages/StudentHome";
import ExamInstructions from "./pages/ExamInstructions";
import ExamAttempt from "./pages/ExamAttempt";
import ResultPage from "./pages/Result";
import MyResults from "./pages/MyResults";
import AdminLogin from "./pages/admin/AdminLogin";
import AdminHome from "./pages/admin/AdminHome";
import Students from "./pages/admin/Students";
import ImportStudents from "./pages/admin/ImportStudents";
import Settings from "./pages/admin/Settings";
import Exams from "./pages/admin/Exams";
import ExamEditor from "./pages/admin/ExamEditor";
import Levels from "./pages/admin/Levels";
import ExamResults from "./pages/admin/ExamResults";
import Leaderboard from "./pages/Leaderboard";

// Route guards: UI convenience only — the database (RLS) is what actually protects data.
function StudentOnly({ children }: { children: ReactNode }) {
  const { loading, session, role, student } = useAuth();
  const path = useLocation().pathname;
  if (loading) return <p className="p-6">Loading…</p>;
  if (!session || role !== "student" || !student) return <Navigate to={role === "admin" ? "/admin" : "/login"} replace />;
  if (student.must_change_password && path !== "/change-password") return <Navigate to="/change-password" replace />;
  return children;
}

function AdminOnly({ children }: { children: ReactNode }) {
  const { loading, session, role } = useAuth();
  if (loading) return <p className="p-6">Loading…</p>;
  if (!session || role !== "admin") return <Navigate to="/admin/login" replace />;
  return <><AdminBar />{children}</>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<StudentLogin />} />
          <Route path="/change-password" element={<StudentOnly><ChangePassword /></StudentOnly>} />
          <Route path="/" element={<StudentOnly><StudentHome /></StudentOnly>} />
          <Route path="/exam/:id" element={<StudentOnly><ExamInstructions /></StudentOnly>} />
          <Route path="/attempt/:id" element={<StudentOnly><ExamAttempt /></StudentOnly>} />
          <Route path="/result/:id" element={<StudentOnly><ResultPage /></StudentOnly>} />
          <Route path="/leaderboard/:id" element={<StudentOnly><Leaderboard /></StudentOnly>} />
          <Route path="/results" element={<StudentOnly><MyResults /></StudentOnly>} />
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminOnly><AdminHome /></AdminOnly>} />
          <Route path="/admin/students" element={<AdminOnly><Students /></AdminOnly>} />
          <Route path="/admin/students/import" element={<AdminOnly><ImportStudents /></AdminOnly>} />
          <Route path="/admin/exams" element={<AdminOnly><Exams /></AdminOnly>} />
          <Route path="/admin/exams/new" element={<AdminOnly><ExamEditor key="new" /></AdminOnly>} />
          <Route path="/admin/exams/:id/results" element={<AdminOnly><ExamResults /></AdminOnly>} />
          <Route path="/admin/exams/:id" element={<AdminOnly><ExamEditor /></AdminOnly>} />
          <Route path="/admin/levels" element={<AdminOnly><Levels /></AdminOnly>} />
          <Route path="/admin/settings" element={<AdminOnly><Settings /></AdminOnly>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
