import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorBox, Page, Segmented } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";

type Row = { id: string; correct: number; total: number; submitted_at: string; exams: { name: string; mode: string } | null };

export default function MyResults() {
  const [mode, setMode] = useState<"official" | "practice">("official");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("attempts").select("id, correct, total, submitted_at, exams(name, mode)").neq("status", "in_progress").order("submitted_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(friendly(error)) : setRows(data as unknown as Row[])));
  }, []);
  const list = (rows ?? []).filter((r) => r.exams?.mode === mode);
  return (
    <Page title="My results">
      <ErrorBox>{error}</ErrorBox>
      <div className="mb-5"><Segmented value={mode} onChange={setMode} options={[["official", "Exams"], ["practice", "Practice"]]} /></div>
      {rows === null && !error ? <p>Loading…</p> : !list.length ? <Card><p className="text-slate-600">No results yet.</p></Card> : list.map((r) => (
        <Link key={r.id} to={`/result/${r.id}`} className="mb-3 block rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
          <div className="flex justify-between"><b>{r.exams?.name}</b><b>{r.correct}/{r.total}</b></div>
          <p className="text-sm text-slate-600">{new Date(r.submitted_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
        </Link>
      ))}
      <Link to="/" className="mt-6 block text-center text-indigo-700 underline">Back to home</Link>
    </Page>
  );
}
