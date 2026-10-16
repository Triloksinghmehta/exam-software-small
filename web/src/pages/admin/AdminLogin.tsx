import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { Button, Card, ErrorBox, Field, Page } from "../../components/ui";
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
      if (!isAdmin) { await supabase.auth.signOut(); throw new Error("This account is not an admin"); }
      await refresh();
      nav("/admin", { replace: true });
    } catch (err) {
      setError(friendly(err).replace("Wrong ID", "Wrong email"));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Admin Login">
      <Card>
        <form onSubmit={submit}>
          <ErrorBox>{error}</ErrorBox>
          <Field label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          <Field label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          <Button className="w-full" disabled={busy}>{busy ? "Logging in…" : "Login"}</Button>
        </form>
      </Card>
    </Page>
  );
}
