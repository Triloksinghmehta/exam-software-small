import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, ErrorBox, Icon } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { when, type Exam } from "./admin/Exams";

type Attempt = { id: string; exam_id: string; status: string; correct: number | null; total: number | null; submitted_at: string | null };

// Built for young children: one big thing per card, one big button, very little text.
const BIG = "block w-full rounded-2xl px-6 py-4 text-center text-xl font-bold transition active:scale-[0.98]";

type Kind = "live" | "scheduled" | "done" | "missed";
const PILL: Record<Kind, { label: string; cls: string }> = {
  live: { label: "Live now", cls: "bg-red-50 text-red-700" },
  scheduled: { label: "Coming soon", cls: "bg-amber-50 text-amber-800" },
  done: { label: "Finished", cls: "bg-emerald-50 text-emerald-800" },
  missed: { label: "Ended", cls: "bg-slate-100 text-slate-600" },
};

function stateOf(e: Exam, attempts: Attempt[]) {
  const mine = attempts.filter((a) => a.exam_id === e.id);
  const open = mine.find((a) => a.status === "in_progress");
  const last = mine.filter((a) => a.status !== "in_progress").sort((a, b) => b.submitted_at!.localeCompare(a.submitted_at!))[0];
  const now = Date.now();
  const isOpen = e.status === "published" && now >= Date.parse(e.starts_at) && now <= Date.parse(e.ends_at);
  let kind: Kind;
  if (isOpen && (open || e.attempts_allowed > mine.length)) kind = "live";
  else if (e.status === "published" && now < Date.parse(e.starts_at)) kind = "scheduled";
  else kind = last ? "done" : "missed";
  return { kind, open, last };
}

function TestCard({ e, attempts }: { e: Exam; attempts: Attempt[] }) {
  const { kind, open, last } = stateOf(e, attempts);
  const practice = e.mode === "practice";
  const live = kind === "live";
  return (
    <div className={`rounded-3xl bg-white p-5 ring-1 ${live ? "shadow-[0_6px_24px_rgba(36,69,49,0.14)] ring-indigo-600/40" : "shadow-sm ring-slate-200/70"}`}>
      <div className="mb-4 flex items-start gap-4">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${practice ? "bg-brass-400/25 text-brass-600" : "bg-indigo-600/10 text-indigo-700"}`}>
          <Icon name={practice ? "pencil" : "exams"} className="h-9 w-9" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="font-display block text-2xl leading-snug sm:text-3xl">{e.name}</b>
          <span className="text-base text-slate-600">{practice ? "Practice" : "Exam"}</span>
        </div>
      </div>
      <span className={`mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-bold ${PILL[kind].cls}`}>
        {live && <span className="relative flex h-2.5 w-2.5"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative h-2.5 w-2.5 rounded-full bg-red-600" /></span>}
        {PILL[kind].label}
      </span>
      <p className="mb-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-base text-slate-600">
        <Icon name="clock" className="h-5 w-5 text-indigo-600" />
        {kind === "scheduled" ? <>Opens {when(e.starts_at)}</> : live ? <>Closes {when(e.ends_at)}</> : <>Closed {when(e.ends_at)}</>}
        <span className="text-slate-400">·</span>{e.duration_minutes} min
      </p>
      {live && (
        <Link to={open ? `/attempt/${open.id}` : `/exam/${e.id}`} className={`${BIG} flex items-center justify-center gap-3 bg-indigo-600 text-white shadow-md hover:bg-indigo-700`}>
          {open ? "Keep going" : "Start"}<Icon name="arrow" className="h-7 w-7" />
        </Link>
      )}
      {kind === "scheduled" && <span className={`${BIG} bg-slate-100 text-slate-500`}>Not open yet</span>}
      {kind === "done" && last && (
        <Link to={`/result/${last.id}`} className={`${BIG} border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-600/5`}>See result: {last.correct}/{last.total}</Link>
      )}
      {kind === "missed" && <span className={`${BIG} bg-slate-100 text-slate-500`}>{practice ? "Closed" : "You missed this one"}</span>}
    </div>
  );
}

export default function StudentHome() {
  const { student } = useAuth();
  const [exams, setExams] = useState<Exam[] | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [error, setError] = useState("");

  async function load() {
    setError("");
    // RLS: only published/closed exams of my level, only my attempts
    const [e, a] = await Promise.all([
      supabase.from("exams").select("*").order("starts_at"),
      supabase.from("attempts").select("id, exam_id, status, correct, total, submitted_at"),
    ]);
    if (e.error || a.error) return setError(friendly(e.error ?? a.error));
    setExams(e.data); setAttempts(a.data);
  }
  useEffect(() => { load(); }, []);
  if (!student) return null;

  const now = Date.now();
  // Hide exams closed more than 30 days ago that I never attempted
  const recent = (exams ?? []).filter((e) => Date.parse(e.ends_at) > now - 30 * 86400000 || attempts.some((a) => a.exam_id === e.id));
  const by = (k: Kind[]) => recent.filter((e) => k.includes(stateOf(e, attempts).kind));
  const live = by(["live"]).sort((a, b) => Number(a.mode === "practice") - Number(b.mode === "practice"));
  const soon = by(["scheduled"]).sort((a, b) => a.starts_at.localeCompare(b.starts_at));
  const ended = by(["done", "missed"]).sort((a, b) => b.ends_at.localeCompare(a.ends_at));
  const first = student.full_name.split(" ")[0];
  const group = (title: string, list: Exam[]) => list.length > 0 && (
    <section className="mb-10 space-y-5">
      <h2 className="text-xl font-bold text-slate-800">{title} <span className="text-slate-400">({list.length})</span></h2>
      {list.map((e) => <TestCard key={e.id} e={e} attempts={attempts} />)}
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-8 sm:py-12">
      <header className="mb-8 flex items-center gap-4">
        <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-indigo-700 text-brass-400"><Icon name="abacus" className="h-9 w-9" /></span>
        <div><h1 className="font-display text-4xl font-medium text-slate-900 sm:text-5xl">Hi, {first}</h1><p className="text-lg text-slate-600">Your tests</p></div>
      </header>

      {student.password_shared && (
        <p className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-base">
          Please <Link to="/change-password" className="font-bold text-indigo-700 underline">change your password</Link> to keep your account safe.
        </p>
      )}
      {error && <><ErrorBox>{error}</ErrorBox><Button variant="secondary" className="mb-4" onClick={load}>Try again</Button></>}

      {exams === null && !error ? (
        <div className="space-y-5">{[0, 1].map((i) => <div key={i} className="h-44 animate-pulse rounded-3xl bg-slate-200/70" />)}</div>
      ) : (
        <>
          {live.length === 0 && (
            <section className="mb-10 flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-6">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700"><Icon name="check" className="h-9 w-9" /></span>
              <b className="font-display text-2xl">Nothing is live right now</b>
            </section>
          )}
          {group("Live now", live)}
          {group("Coming soon", soon)}
          {group("Ended", ended)}
        </>
      )}
    </main>
  );
}
