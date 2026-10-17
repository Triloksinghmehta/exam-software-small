import { useEffect, useState } from "react";
import { Button, Card, ErrorBox, Field, Page, Toggle, useConfirm } from "../../components/ui";
import { friendly, supabase } from "../../lib/supabase";

type S = {
  id_prefix: string; import_mode: "auto" | "custom"; ac_fullscreen: boolean; ac_log_leaves: boolean; ac_block_copy: boolean;
  ac_single_session: boolean; ac_auto_submit_after: number;
};
const SWITCHES: [keyof S, string, string][] = [
  ["ac_fullscreen", "Full screen during exam", "The exam opens full screen so students can't easily look at other windows."],
  ["ac_log_leaves", "Record leaving the exam screen", "Counts every time a student switches tab or window. You can see the count in results."],
  ["ac_block_copy", "Block copy / paste / right-click", "Stops students from copying questions or pasting answers from elsewhere."],
  ["ac_single_session", "Only one login at a time", "A student can be logged in on one device only. A new login signs out the old one."],
];

export default function Settings() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [ask, dialog] = useConfirm();
  const [pw, setPw] = useState({ a: "", b: "" });
  const [pwMsg, setPwMsg] = useState("");
  const [pwErr, setPwErr] = useState("");
  useEffect(() => {
    supabase.from("settings").select("*").single().then(({ data, error }) => error ? setError(friendly(error)) : setS({ ...data, ac_auto_submit_after: data.ac_auto_submit_after ?? 1 })); // never empty: default 1
  }, []);
  if (!s) return <Page title="Settings" wide><ErrorBox>{error}</ErrorBox><p>Loading…</p></Page>;

  async function save() {
    setMsg(""); setError("");
    if (!/^[A-Z]{2,6}$/.test(s!.id_prefix)) return setError("Student ID start must be 2 to 6 capital letters");
    const { error } = await supabase.from("settings").update(s!).eq("id", 1);
    if (error) setError(friendly(error)); else setMsg("Saved");
  }
  async function changePassword() {
    setPwMsg(""); setPwErr("");
    if (pw.a.length < 8) return setPwErr("Password must be at least 8 characters");
    if (pw.a !== pw.b) return setPwErr("The two passwords are not the same");
    if (!(await ask({ title: "Change your admin password?", message: "You will use the new password the next time you log in. The old one will stop working.", yes: "Change password", icon: "settings" }))) return;
    const { error } = await supabase.auth.updateUser({ password: pw.a });
    if (error) setPwErr(friendly(error)); else { setPw({ a: "", b: "" }); setPwMsg("Password changed."); }
  }
  const yy = String(new Date().getFullYear() % 100).padStart(2, "0");

  return (
    <Page title="Settings" wide>
      <ErrorBox>{error}</ErrorBox>
      <Card className="mb-4">
        <label className="block">
          <span className="block mb-1 font-medium">Student ID start</span>
          <input className="w-40 rounded-lg border border-slate-300 px-3 py-3 text-lg uppercase" maxLength={6}
            value={s.id_prefix} onChange={(e) => setS({ ...s, id_prefix: e.target.value.toUpperCase().replace(/[^A-Z]/g, "") })} />
        </label>
        <p className="mt-2 text-sm text-slate-500">The letters at the start of every student ID (2–6 capitals). New students get IDs like <b>{s.id_prefix}{yy}0001</b>. Existing IDs don't change.</p>
      </Card>
      <Card className="mb-4">
        <h2 className="mb-1 text-xl font-bold">Student ID and password when importing</h2>
        <p className="mb-2 text-sm text-slate-500">Applies to the CSV upload on the Students page.</p>
        {([["auto", "Automatic", "The system makes the ID and a random password for every student."],
          ["custom", "From my file", "Your CSV has two extra columns, student_id and password. Leave a cell blank to get an automatic one. Students with a password you chose see a banner asking them to change it."]] as const).map(([v, t, d]) => (
          <label key={v} className="flex items-start gap-3 border-b border-slate-100 py-3">
            <input type="radio" name="import_mode" className="mt-1 h-5 w-5" checked={s.import_mode === v} onChange={() => setS({ ...s, import_mode: v })} />
            <span>{t}<span className="block text-sm text-slate-500">{d}</span></span>
          </label>
        ))}
      </Card>
      <Card className="mb-4">
        <h2 className="mb-2 text-xl font-bold">Anti-cheat</h2>
        {SWITCHES.map(([k, label, hint]) => (
          <label key={k} className="flex items-center justify-between border-b border-slate-100 py-3">
            <span>{label}<span className="block text-sm text-slate-500">{hint}</span></span>
            <Toggle checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
          </label>
        ))}
        <label className="flex items-center justify-between py-3 gap-3">
          <span>Auto-submit after leaving the screen this many times<span className="block text-sm text-slate-500">The exam submits by itself once a student leaves the screen this many times.</span></span>
          <input type="number" min={1} className="w-24 rounded-lg border border-slate-300 px-3 py-2"
            value={s.ac_auto_submit_after} onChange={(e) => setS({ ...s, ac_auto_submit_after: Math.max(1, Math.floor(Number(e.target.value)) || 1) })} />
        </label>
      </Card>
      <Card className="mb-4">
        <h2 className="mb-3 text-xl font-bold">Change my password</h2>
        <ErrorBox>{pwErr}</ErrorBox>
        {pwMsg && <p role="status" className="mb-4 rounded-md border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{pwMsg}</p>}
        <div className="grid gap-x-4 sm:grid-cols-2">
          <Field label="New password" type="password" autoComplete="new-password" placeholder="at least 8 characters" value={pw.a} onChange={(e) => setPw({ ...pw, a: e.target.value })} />
          <Field label="Type it again" type="password" autoComplete="new-password" value={pw.b} onChange={(e) => setPw({ ...pw, b: e.target.value })} />
        </div>
        <Button variant="secondary" onClick={changePassword}>Change password</Button>
      </Card>
      {dialog}
      <Button onClick={save}>Save</Button> <span className="ml-2 text-sm text-slate-500">Changes apply only after you press Save.</span> {msg && <span className="ml-3 text-green-700">{msg}</span>}
    </Page>
  );
}
