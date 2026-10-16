import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ErrorBox, Field, Page } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function ChangePassword() {
  const { refresh } = useAuth();
  const nav = useNavigate();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (p1.length < 6) return setError("Password must be at least 6 characters");
    if (p1 !== p2) return setError("The two passwords are not the same");
    setBusy(true); setError("");
    try {
      const { error } = await supabase.auth.updateUser({ password: p1 });
      if (error) throw error;
      const { error: e2 } = await supabase.rpc("mark_password_changed");
      if (e2) throw e2;
      await refresh();
      nav("/", { replace: true });
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Page title="Set your new password">
      <Card>
        <form onSubmit={submit}>
          <ErrorBox>{error}</ErrorBox>
          <Field label="New password" type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" placeholder="at least 6 characters" required />
          <Field label="Type it again" type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" required />
          <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
        </form>
      </Card>
    </Page>
  );
}
