import { Link } from "react-router-dom";
import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Centered, ErrorBox, Field } from "../components/ui";
import { friendly, studentEmail, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function StudentLogin() {
  const { session, role, refresh } = useAuth();
  const nav = useNavigate();
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session && role === "student") return <Navigate to="/" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email: studentEmail(code), password });
      if (error) throw error;
      await supabase.rpc("claim_session"); // newest login wins ("one login at a time")
      const { data: s } = await supabase.from("students").select("status").maybeSingle();
      if (!s) { await supabase.auth.signOut({ scope: "local" }); throw new Error("Wrong ID or password"); } // e.g. an admin account
      if (s.status !== "active") { await supabase.auth.signOut({ scope: "local" }); throw new Error("Account disabled. Please contact your teacher."); }
      await refresh();
      nav("/", { replace: true });
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered title="Welcome back" subtitle="Log in with your Student ID">
        <form onSubmit={submit}>
          <ErrorBox>{error}</ErrorBox>
          <Field label="Student ID" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="username" placeholder="SAI260001" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button className="w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</Button>
        </form>
        <p className="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">Are you an admin? <Link to="/admin/login" className="font-semibold text-indigo-600 hover:underline">Log in as admin</Link></p>
    </Centered>
  );
}
