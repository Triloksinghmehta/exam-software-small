import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, ErrorBox, Icon, Page } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";

type Result = {
  leaderboard_available: boolean;
  exam_name: string; mode: string; status: string; total: number; answered: number; correct: number; wrong: number; skipped: number;
  percent: number; started_at: string; submitted_at: string; time_taken_seconds: number;
};
const time = (s: number) => `${Math.floor(s / 60)} min ${s % 60} sec`;
const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });

export default function ResultPage() {
  const { id } = useParams();
  const [r, setR] = useState<Result | null>(null);
  const [examId, setExamId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.rpc("get_result", { p_attempt: id }).then(({ data, error }) => (error ? setError(friendly(error)) : setR(data)));
    supabase.from("attempts").select("exam_id").eq("id", id).maybeSingle().then(({ data }) => setExamId(data?.exam_id ?? ""));
  }, [id]);

  if (!r) return <Page title="Result"><ErrorBox>{error}</ErrorBox>{!error && <div className="h-40 animate-pulse rounded-2xl bg-slate-200/70" />}<Link className="text-indigo-700 underline" to="/">Back to home</Link></Page>;

  const pct = Math.round(r.percent);
  const ring = pct >= 80 ? "#059669" : pct >= 50 ? "#8f7f60" : "#dc2626";
  const msg = pct >= 80 ? "Excellent work" : pct >= 50 ? "Good effort" : "Keep practising";
  const C = 2 * Math.PI * 52;
  const stat = (icon: string, n: number, label: string, cls: string, bg: string) => (
    <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${bg} ${cls}`}><Icon name={icon} className="h-6 w-6" /></span>
      <div><b className="font-display block text-3xl leading-none">{n}</b><span className="text-sm text-slate-600">{label}</span></div>
    </div>
  );

  return (
    <Page title={r.exam_name} wide eyebrow={r.mode === "practice" ? "Practice result" : "Exam result"}>
      <section className="mb-6 flex flex-col items-center gap-6 rounded-2xl bg-gradient-to-b from-indigo-500 to-indigo-600 p-6 text-white shadow-md sm:flex-row sm:p-8">
        <div className="relative h-36 w-36 shrink-0">
          <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img" aria-label={`${pct} percent`}>
            <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="10" />
            <circle cx="60" cy="60" r="52" fill="none" stroke={ring} strokeWidth="10" strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - pct / 100)} />
          </svg>
          <div className="absolute inset-0 grid place-items-center"><b className="font-display text-4xl">{pct}%</b></div>
        </div>
        <div className="text-center sm:text-left">
          <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/90">{msg}</p>
          <p className="font-display mt-1 text-5xl font-medium">{r.correct} <span className="text-white/70">/ {r.total}</span></p>
          <p className="mt-2 text-white/75">correct answers</p>
        </div>
      </section>

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stat("check", r.correct, "Correct", "text-emerald-700", "bg-emerald-100")}
        {stat("x", r.wrong, "Wrong", "text-red-700", "bg-red-100")}
        {stat("minus", r.skipped, "Skipped", "text-slate-600", "bg-slate-100")}
        {stat("pencil", r.answered, "Answered", "text-indigo-700", "bg-indigo-600/10")}
      </div>

      <Card className="mb-8 flex flex-wrap items-center gap-x-8 gap-y-2 text-sm text-slate-600">
        <span className="flex items-center gap-2"><Icon name="clock" className="h-5 w-5 text-indigo-600" />Time taken <b className="text-slate-900">{time(r.time_taken_seconds)}</b></span>
        <span>Started {clock(r.started_at)}</span>
        <span>Submitted {clock(r.submitted_at)}</span>
        <span>{r.status === "auto_submitted" ? "Submitted automatically" : "Submitted by you"}</span>
      </Card>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {r.leaderboard_available && examId && <Link to={`/leaderboard/${examId}`} className="rounded-xl border-2 border-indigo-600 px-4 py-3.5 text-center text-lg font-semibold text-indigo-700 hover:bg-indigo-600/5">See leaderboard</Link>}
        <Link to="/" className="rounded-xl bg-indigo-600 px-4 py-3.5 text-center text-lg font-semibold text-white hover:bg-indigo-700 sm:col-start-2">Back to home</Link>
      </div>
    </Page>
  );
}
