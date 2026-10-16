import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorBox, Page } from "../../components/ui";
import { friendly, supabase } from "../../lib/supabase";

export type Exam = {
  id: string; name: string; mode: "official" | "practice"; level: number; rules: unknown[];
  duration_minutes: number; starts_at: string; ends_at: string; attempts_allowed: number;
  status: "draft" | "published" | "closed"; leaderboard_public: boolean;
};

export const when = (iso: string) =>
  new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

// What the admin sees: Draft / Scheduled / Open / Ended / Closed
export function examState(e: Exam) {
  if (e.status === "draft") return { label: "Draft", cls: "bg-slate-200" };
  if (e.status === "closed") return { label: "Closed", cls: "bg-slate-300" };
  const now = Date.now();
  if (now < Date.parse(e.starts_at)) return { label: "Scheduled", cls: "bg-amber-200" };
  if (now > Date.parse(e.ends_at)) return { label: "Ended", cls: "bg-slate-300" };
  return { label: "Open", cls: "bg-green-200" };
}

export default function Exams() {
  const [mode, setMode] = useState<"official" | "practice">("official");
  const [list, setList] = useState<Exam[] | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.from("exams").select("*").order("starts_at", { ascending: false })
      .then(({ data, error }) => (error ? setError(friendly(error)) : setList(data)));
  }, []);
  const rows = (list ?? []).filter((e) => e.mode === mode);
  const tab = (m: typeof mode, label: string) => (
    <button onClick={() => setMode(m)} className={`rounded-xl px-4 py-3 font-semibold ${mode === m ? "bg-blue-600 text-white" : "bg-white border-2 border-blue-600 text-blue-700"}`}>{label}</button>
  );

  return (
    <Page title="Exams" wide>
      <ErrorBox>{error}</ErrorBox>
      <div className="mb-4 flex flex-wrap gap-2">
        {tab("official", "Official")}{tab("practice", "Practice")}
        <Link to={`/admin/exams/new?mode=${mode}`} className="ml-auto rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">+ Create exam</Link>
      </div>
      {list === null ? <p>Loading…</p> : !rows.length ? (
        <Card><p>No {mode} exams yet. Click <b>Create exam</b>.</p></Card>
      ) : rows.map((e) => {
        const s = examState(e);
        return (
          <Link key={e.id} to={`/admin/exams/${e.id}/results`} className="mb-3 block rounded-2xl bg-white p-4 shadow-sm hover:ring-2 hover:ring-blue-300">
            <div className="flex items-center justify-between gap-2">
              <b className="text-lg">{e.name}</b>
              <span className={`rounded-full px-3 py-1 text-sm ${s.cls}`}>{s.label}</span>
            </div>
            <p className="text-slate-600">Level {e.level} · {when(e.starts_at)} → {when(e.ends_at)} · {e.duration_minutes} min</p>
          </Link>
        );
      })}
    </Page>
  );
}
