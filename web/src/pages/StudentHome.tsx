import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, ErrorBox, Icon } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { when, type Exam } from "./admin/Exams";

type Attempt = { id: string; exam_id: string; status: string; correct: number | null; total: number | null; submitted_at: string | null };

// Built for young children: one big thing per card, one big button, very little text.
const BIG = "block w-full rounded-xl px-5 py-3 text-center text-lg font-bold transition active:scale-[0.98]";

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
    <div className={`flex flex-col rounded-2xl bg-white p-4 ring-1 ${live ? "shadow-[0_6px_24px_rgba(36,69,49,0.14)] ring-indigo-600/40" : "shadow-sm ring-slate-200/70"}`}>
      <div className="flex items-start gap-3">
        <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${practice ? "bg-brass-400/25 text-brass-600" : "bg-indigo-600/10 text-indigo-700"}`}>
          <Icon name={practice ? "pencil" : "exams"} className="h-7 w-7" />
        </span>
        <div className="min-w-0 flex-1">
          <b className="font-display block truncate text-xl leading-snug sm:text-2xl">{e.name}</b>
          <span className="text-sm text-slate-600">{practice ? "Practice" : "Exam"} · {e.duration_minutes} min</span>
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-bold ${PILL[kind].cls}`}>
          {live && <span className="relative flex h-2 w-2"><span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" /><span className="relative h-2 w-2 rounded-full bg-red-600" /></span>}
          {PILL[kind].label}
        </span>
      </div>
      <p className="mb-3 mt-3 flex items-center gap-2 text-sm text-slate-600">
        <Icon name="clock" className="h-4 w-4 text-indigo-600" />
        {kind === "scheduled" ? <>Opens {when(e.starts_at)}</> : live ? <>Closes {when(e.ends_at)}</> : <>Closed {when(e.ends_at)}</>}
      </p>
      <div className="mt-auto">
        {live && (
          <Link to={open ? `/attempt/${open.id}` : `/exam/${e.id}`} className={`${BIG} flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-md hover:bg-indigo-700`}>
            {open ? "Keep going" : "Start"}<Icon name="arrow" className="h-6 w-6" />
          </Link>
        )}
        {kind === "scheduled" && <span className={`${BIG} bg-slate-100 text-slate-500`}>Not open yet</span>}
        {kind === "done" && last && (
          <Link to={`/result/${last.id}`} className={`${BIG} border-2 border-indigo-600 text-indigo-700 hover:bg-indigo-600/5`}>See result: {last.correct}/{last.total}</Link>
        )}
        {kind === "missed" && <span className={`${BIG} bg-slate-100 text-slate-500`}>{practice ? "Closed" : "You missed this one"}</span>}
      </div>
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
    <section className="mb-8">
      <h2 className="mb-3 text-xl font-bold text-slate-800">{title} <span className="text-slate-400">({list.length})</span></h2>
      <div className="grid items-stretch gap-4 md:grid-cols-2">{list.map((e) => <TestCard key={e.id} e={e} attempts={attempts} />)}</div>
    </section>
  );

  return (
    <main className="mx-auto w-full max-w-5xl px-4 py-8 sm:px-8 sm:py-10">
      <header className="relative mb-8 overflow-hidden rounded-3xl bg-indigo-700 px-6 pb-14 pt-7 text-white shadow-md sm:px-8">
        <svg aria-hidden="true" viewBox="0 0 1200 120" preserveAspectRatio="none" className="absolute inset-x-0 bottom-0 h-14 w-full">
          <path d="M0 60 C150 110 300 10 450 50 C600 90 750 110 900 60 C1050 10 1130 40 1200 70 L1200 120 L0 120 Z" fill="rgba(232,178,60,0.35)" />
          <path d="M0 85 C200 40 350 120 600 85 C850 50 1000 110 1200 80 L1200 120 L0 120 Z" className="fill-slate-50" />
        </svg>
        <div className="relative flex items-center gap-4">
          <span className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-white/15 text-brass-400"><Icon name="abacus" className="h-9 w-9" /></span>
          <div><h1 className="font-display text-4xl font-medium sm:text-5xl">Hi, {first}</h1><p className="text-lg text-white/75">Your tests</p></div>
        </div>
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
            <section className="mb-8 flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4">
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
