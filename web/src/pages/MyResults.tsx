import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorBox, Page } from "../components/ui";
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
  const tab = (m: typeof mode, label: string) => (
    <button onClick={() => setMode(m)} className={`flex-1 rounded-xl px-4 py-3 font-semibold ${mode === m ? "bg-blue-600 text-white" : "border-2 border-blue-600 text-blue-700"}`}>{label}</button>
  );
  return (
    <Page title="My results">
      <ErrorBox>{error}</ErrorBox>
      <div className="mb-4 flex gap-2">{tab("official", "Exams")}{tab("practice", "Practice")}</div>
      {rows === null && !error ? <p>Loading…</p> : !list.length ? <Card><p className="text-slate-600">No results yet.</p></Card> : list.map((r) => (
        <Link key={r.id} to={`/result/${r.id}`} className="mb-3 block rounded-2xl bg-white p-4 shadow-sm hover:ring-2 hover:ring-blue-300">
          <div className="flex justify-between"><b>{r.exams?.name}</b><b>{r.correct}/{r.total}</b></div>
          <p className="text-sm text-slate-600">{new Date(r.submitted_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
        </Link>
      ))}
      <Link to="/" className="mt-6 block text-center text-blue-700 underline">Back to home</Link>
    </Page>
  );
}
