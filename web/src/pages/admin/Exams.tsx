import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, ErrorBox, Icon, LinkButton, Page, Segmented } from "../../components/ui";
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
  if (e.status === "draft") return { label: "Draft", tone: "slate" as const };
  if (e.status === "closed") return { label: "Closed", tone: "slate" as const };
  const now = Date.now();
  if (now < Date.parse(e.starts_at)) return { label: "Scheduled", tone: "amber" as const };
  if (now > Date.parse(e.ends_at)) return { label: "Ended", tone: "slate" as const };
  return { label: "Open", tone: "green" as const };
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
  return (
    <Page title="Exams" wide actions={<LinkButton to={`/admin/exams/new?mode=${mode}`}>+ Create exam</LinkButton>}>
      <ErrorBox>{error}</ErrorBox>
      <div className="mb-5"><Segmented value={mode} onChange={setMode} options={[["official", "Official"], ["practice", "Practice"]]} /></div>
      {list === null ? <p className="text-slate-500">Loading…</p> : !rows.length ? (
        <Card><p className="text-slate-600">No {mode} exams yet. Click <b>Create exam</b>.</p></Card>
      ) : <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{rows.map((e) => {
        const s = examState(e);
        return (
          <div key={e.id} className="flex items-center rounded-lg border border-slate-200/80 bg-white transition hover:border-indigo-300">
          <Link to={`/admin/exams/${e.id}/results`} className="block min-w-0 flex-1 p-5">
            <div className="mb-3 flex items-start justify-between gap-2">
              <b className="text-lg leading-snug">{e.name}</b>
              <Badge tone={s.tone}>{s.label}</Badge>
            </div>
            <p className="flex items-center gap-2 text-sm text-slate-600"><Icon name="levels" className="h-4 w-4" />Level {e.level} · {e.duration_minutes} min</p>
            <p className="mt-1 flex items-center gap-2 text-sm text-slate-600"><Icon name="clock" className="h-4 w-4" />{when(e.starts_at)} to {when(e.ends_at)}</p>
          </Link>
          <Link aria-label={`Edit ${e.name}`} title="Edit exam" to={`/admin/exams/${e.id}`} className="mr-4 grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-slate-300 bg-white text-indigo-700 transition hover:border-indigo-600 hover:bg-indigo-600/5"><Icon name="pencil" className="h-4 w-4" /></Link>
          </div>
        );
      })}</div>}
    </Page>
  );
}
