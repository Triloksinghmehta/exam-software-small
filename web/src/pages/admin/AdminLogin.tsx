import { useState, type FormEvent } from "react";
import { Link, Navigate, useNavigate } from "react-router-dom";
import { Button, Centered, ErrorBox, Field, LinkButton } from "../../components/ui";
import { friendly, supabase } from "../../lib/supabase";
import { useAuth } from "../../lib/auth";

export default function AdminLogin() {
  const { session, role, refresh } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (session && role === "admin") return <Navigate to="/admin" replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) throw error;
      const { data: isAdmin } = await supabase.rpc("is_admin");
      if (!isAdmin) { await supabase.auth.signOut({ scope: "local" }); throw new Error("This account is not an admin"); }
      await refresh();
      nav("/admin", { replace: true });
    } catch (err) {
      setError(friendly(err).replace("Wrong ID", "Wrong email"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Centered title="Admin login" subtitle="Manage students and exams">
        <form onSubmit={submit}>
          <ErrorBox>{error}</ErrorBox>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button className="w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</Button>
        </form>
        <LinkButton to="/help?for=admin" variant="secondary" className="mt-3 w-full">How to use this platform</LinkButton>
        <p className="mt-5 border-t border-slate-200 pt-4 text-center text-sm text-slate-500">Are you a student? <Link to="/login" className="font-semibold text-indigo-600 hover:underline">Log in as student</Link></p>
    </Centered>
  );
}
