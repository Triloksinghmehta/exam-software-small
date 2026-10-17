import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, ErrorBox, Icon, Page, Segmented } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { when, type Exam } from "./admin/Exams";

type Row = { id: string; correct: number; total: number; submitted_at: string; exams: { name: string; mode: string } | null };

const pctOf = (r: { correct: number; total: number }) => (r.total ? Math.round((r.correct / r.total) * 100) : 0);
const tone = (p: number) => (p >= 80 ? "bg-emerald-600" : p >= 50 ? "bg-brass-500" : "bg-red-600");
const day = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

const tile = (icon: string, label: string, value: string | number) => (
  <div className="flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
    <span className="grid h-14 w-14 shrink-0 place-items-center rounded-xl bg-indigo-600/10 text-indigo-700"><Icon name={icon} className="h-7 w-7" /></span>
    <div className="min-w-0">
      <p className="text-sm font-semibold text-slate-500">{label}</p>
      <p className="font-display text-4xl font-medium leading-tight text-slate-900">{value}</p>
    </div>
  </div>
);

// Progress and results in one place, written so a parent can read it at a glance.
export default function MyResults() {
  const { student } = useAuth();
  const [mode, setMode] = useState<"official" | "practice">("official");
  const [rows, setRows] = useState<Row[] | null>(null);
  const [upcoming, setUpcoming] = useState<Exam[]>([]);
  const [error, setError] = useState("");
  useEffect(() => {
    // RLS: only my own attempts and my level's exams
    Promise.all([
      supabase.from("attempts").select("id, correct, total, submitted_at, exams(name, mode)").neq("status", "in_progress").order("submitted_at", { ascending: false }),
      supabase.from("exams").select("*").eq("status", "published").gt("starts_at", new Date().toISOString()).order("starts_at"),
    ]).then(([a, e]) => {
      if (a.error || e.error) return setError(friendly(a.error ?? e.error));
      setRows(a.data as unknown as Row[]); setUpcoming(e.data);
    });
  }, []);

  const all = rows ?? [];
  const list = all.filter((r) => r.exams?.mode === mode);
  const avg = all.length ? Math.round(all.reduce((s, r) => s + pctOf(r), 0) / all.length) : null;
  const best = all.length ? Math.max(...all.map(pctOf)) : null;
  const trend = [...all].slice(0, 10).reverse(); // oldest to newest, last 10

  return (
    <Page title="Progress and results" wide eyebrow={student ? `${student.full_name} · Level ${student.level}` : undefined}>
      <ErrorBox>{error}</ErrorBox>
      {rows === null && !error ? <div className="h-40 animate-pulse rounded-2xl bg-slate-200/70" /> : (
        <>
          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            {tile("check", "Tests done", all.length)}
            {tile("levels", "Average score", avg === null ? "-" : `${avg}%`)}
            {tile("home", "Best score", best === null ? "-" : `${best}%`)}
          </div>

          {trend.length > 1 && (
            <Card className="mb-8">
              <h2 className="mb-4 text-sm font-semibold text-slate-600">Last {trend.length} scores</h2>
              <div className="flex h-36 items-end gap-2 sm:gap-3">
                {trend.map((r) => {
                  const p = pctOf(r);
                  return (
                    <div key={r.id} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${r.exams?.name}: ${p}%`}>
                      <span className="text-xs font-semibold text-slate-700">{p}%</span>
                      <div className={`w-full rounded-t-md ${tone(p)}`} style={{ height: `${Math.max(p, 4) * 0.8}%` }} />
                    </div>
                  );
                })}
              </div>
            </Card>
          )}

          <div className="grid gap-8 lg:grid-cols-[1fr_20rem]">
            <section>
              <div className="mb-4"><Segmented value={mode} onChange={setMode} options={[["official", "Exams"], ["practice", "Practice"]]} /></div>
              {!list.length ? <Card><p className="text-slate-600">No results yet.</p></Card> : (
                <div className="space-y-3">
                  {list.map((r) => {
                    const p = pctOf(r);
                    return (
                      <Link key={r.id} to={`/result/${r.id}`} className="block rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-indigo-300 hover:shadow-md">
                        <div className="flex items-center justify-between gap-3">
                          <b className="min-w-0 truncate">{r.exams?.name}</b>
                          <span className="shrink-0 text-lg font-bold">{r.correct}/{r.total}</span>
                        </div>
                        <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"><div className={`h-full rounded-full ${tone(p)}`} style={{ width: `${p}%` }} /></div>
                        <div className="mt-2 flex justify-between text-sm text-slate-600"><span>{day(r.submitted_at)}</span><span className="font-semibold">{p}%</span></div>
                      </Link>
                    );
                  })}
                </div>
              )}
            </section>
            <aside>
              <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Coming soon</h2>
              {upcoming.length === 0 ? <Card><p className="text-sm text-slate-600">No tests are planned yet.</p></Card> : (
                <div className="space-y-3">
                  {upcoming.map((e) => (
                    <div key={e.id} className="flex items-center gap-3 rounded-2xl border-2 border-dashed border-slate-300 p-3">
                      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-slate-100 text-slate-500"><Icon name="clock" className="h-6 w-6" /></span>
                      <div className="min-w-0"><b className="block truncate">{e.name}</b><span className="text-sm text-slate-600">{when(e.starts_at)}</span></div>
                    </div>
                  ))}
                </div>
              )}
            </aside>
          </div>
        </>
      )}
    </Page>
  );
}
