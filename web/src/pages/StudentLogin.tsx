import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Card, ErrorBox, Field, Page } from "../components/ui";
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
      if (!s) { await supabase.auth.signOut(); throw new Error("Wrong ID or password"); } // e.g. an admin account
      if (s.status !== "active") { await supabase.auth.signOut(); throw new Error("Account disabled. Please contact your teacher."); }
      await refresh();
      nav("/", { replace: true });
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Student Login">
      <Card>
        <form onSubmit={submit}>
          <ErrorBox>{error}</ErrorBox>
          <Field label="Student ID" value={code} onChange={(e) => setCode(e.target.value)} autoCapitalize="characters" autoComplete="username" placeholder="SAI260001" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button className="w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</Button>
        </form>
      </Card>
    </Page>
  );
}
