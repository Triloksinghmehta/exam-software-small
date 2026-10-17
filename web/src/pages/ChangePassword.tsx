import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { Button, Card, ErrorBox, Field, Page } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export default function ChangePassword() {
  const { refresh, student } = useAuth();
  const forced = !!student?.must_change_password;
  const nav = useNavigate();
  const [p1, setP1] = useState("");
  const [p2, setP2] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);

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
      setP1(""); setP2(""); setSaved(true);
      if (forced) nav("/", { replace: true });
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  const details: [string, string][] = student ? [
    ["Name", student.full_name], ["Father's name", student.father_name], ["Date of birth", student.dob ? new Date(student.dob).toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "-"],
    ["Student code", student.student_code], ["Level", String(student.level)],
  ] : [];
  return (
    <Page title={forced ? "Set your new password" : "Settings"} wide>
      <div className="grid gap-6 lg:grid-cols-2">
        {!forced && (
          <Card>
            <h2 className="mb-4 text-lg font-bold">Student details</h2>
            <dl className="divide-y divide-slate-100">
              {details.map(([k, v]) => <div key={k} className="flex justify-between gap-4 py-3"><dt className="text-slate-500">{k}</dt><dd className="text-right font-semibold">{v}</dd></div>)}
            </dl>
            <p className="mt-3 text-sm text-slate-500">To correct any detail, please ask your school.</p>
          </Card>
        )}
        <Card>
          <h2 className="mb-4 text-lg font-bold">Change password</h2>
          <form onSubmit={submit}>
            <ErrorBox>{error}</ErrorBox>
            {saved && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">Password saved.</p>}
            <Field label="New password" type="password" value={p1} onChange={(e) => setP1(e.target.value)} autoComplete="new-password" placeholder="at least 6 characters" required />
            <Field label="Type it again" type="password" value={p2} onChange={(e) => setP2(e.target.value)} autoComplete="new-password" required />
            <Button className="w-full" disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          </form>
        </Card>
      </div>
    </Page>
  );
}
