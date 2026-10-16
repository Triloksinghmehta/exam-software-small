import { useEffect, useState } from "react";
import { Button, Card, ErrorBox, Page } from "../../components/ui";
import { friendly, supabase } from "../../lib/supabase";

type S = {
  id_prefix: string; ac_fullscreen: boolean; ac_log_leaves: boolean; ac_block_copy: boolean;
  ac_single_session: boolean; ac_auto_submit_after: number | null;
};
const SWITCHES: [keyof S, string][] = [
  ["ac_fullscreen", "Full screen during exam"],
  ["ac_log_leaves", "Record leaving the exam screen"],
  ["ac_block_copy", "Block copy / paste / right-click"],
  ["ac_single_session", "Only one login at a time"],
];

export default function Settings() {
  const [s, setS] = useState<S | null>(null);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("settings").select("*").single().then(({ data, error }) => error ? setError(friendly(error)) : setS(data));
  }, []);
  if (!s) return <Page title="Settings" wide><ErrorBox>{error}</ErrorBox><p>Loading…</p></Page>;

  async function save() {
    setMsg(""); setError("");
    if (!/^[A-Z]{2,6}$/.test(s!.id_prefix)) return setError("Student ID start must be 2 to 6 capital letters");
    const { error } = await supabase.from("settings").update(s!).eq("id", 1);
    if (error) setError(friendly(error)); else setMsg("Saved");
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
        <p className="mt-2 text-slate-600">New students get IDs like <b>{s.id_prefix}{yy}0001</b>. Existing IDs don't change.</p>
      </Card>
      <Card className="mb-4">
        <h2 className="mb-2 text-xl font-bold">Anti-cheat</h2>
        {SWITCHES.map(([k, label]) => (
          <label key={k} className="flex items-center justify-between border-b border-slate-100 py-3">
            <span>{label}</span>
            <input type="checkbox" className="h-6 w-6" checked={!!s[k]} onChange={(e) => setS({ ...s, [k]: e.target.checked })} />
          </label>
        ))}
        <label className="flex items-center justify-between py-3 gap-3">
          <span>Auto-submit after leaving the screen this many times (empty = off)</span>
          <input type="number" min={1} className="w-24 rounded-lg border border-slate-300 px-3 py-2"
            value={s.ac_auto_submit_after ?? ""} onChange={(e) => setS({ ...s, ac_auto_submit_after: e.target.value ? Math.max(1, Number(e.target.value)) : null })} />
        </label>
      </Card>
      <Button onClick={save}>Save</Button> {msg && <span className="ml-3 text-green-700">{msg}</span>}
    </Page>
  );
}
