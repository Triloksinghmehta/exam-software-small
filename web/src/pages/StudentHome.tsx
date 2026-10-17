import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, ErrorBox, Icon } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { type Exam } from "./admin/Exams";

type Attempt = { id: string; exam_id: string; status: string; correct: number | null; total: number | null; submitted_at: string | null };

// Built for young children: one big thing per card, one big button, very little text.
const BIG = "block w-full rounded-2xl px-6 py-4 text-center text-xl font-bold transition active:scale-[0.98]";

function TestCard({ e, attempts }: { e: Exam; attempts: Attempt[] }) {
  const open = attempts.find((a) => a.exam_id === e.id && a.status === "in_progress");
  const practice = e.mode === "practice";
  return (
    <div className="rounded-3xl bg-white p-5 shadow-[0_6px_24px_rgba(36,69,49,0.10)] ring-1 ring-slate-200/70">
      <div className="mb-5 flex items-center gap-4">
        <span className={`grid h-16 w-16 shrink-0 place-items-center rounded-2xl ${practice ? "bg-brass-400/25 text-brass-600" : "bg-indigo-600/10 text-indigo-700"}`}>
          <Icon name={practice ? "pencil" : "exams"} className="h-9 w-9" />
        </span>
        <div className="min-w-0">
          <b className="font-display block text-2xl leading-snug sm:text-3xl">{e.name}</b>
          <span className="text-base text-slate-600">{practice ? "Practice" : "Exam"}</span>
        </div>
      </div>
      <Link to={open ? `/attempt/${open.id}` : `/exam/${e.id}`} className={`${BIG} flex items-center justify-center gap-3 bg-indigo-600 text-white shadow-md hover:bg-indigo-700`}>
        {open ? "Keep going" : "Start"}<Icon name="arrow" className="h-7 w-7" />
      </Link>
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
  const mineOf = (e: Exam) => attempts.filter((a) => a.exam_id === e.id);
  // Hide exams closed more than 30 days ago that I never attempted
  const recent = (exams ?? []).filter((e) => Date.parse(e.ends_at) > now - 30 * 86400000 || mineOf(e).length);
  const isOpen = (e: Exam) => e.status === "published" && now >= Date.parse(e.starts_at) && now <= Date.parse(e.ends_at);
  const canStart = (e: Exam) => isOpen(e) && (mineOf(e).some((a) => a.status === "in_progress") || e.attempts_allowed > mineOf(e).length);
  const ready = recent.filter(canStart).sort((a, b) => Number(a.mode === "practice") - Number(b.mode === "practice"));
  const first = student.full_name.split(" ")[0];

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
          {ready.length > 0 ? (
            <section className="mb-10 space-y-5">
              <h2 className="text-xl font-bold text-slate-800">Ready for you</h2>
              {ready.map((e) => <TestCard key={e.id} e={e} attempts={attempts} />)}
            </section>
          ) : (
            <section className="mb-10 flex items-center gap-4 rounded-3xl border-2 border-slate-200 bg-white p-6">
              <span className="grid h-16 w-16 shrink-0 place-items-center rounded-2xl bg-emerald-600/10 text-emerald-700"><Icon name="check" className="h-9 w-9" /></span>
              <b className="font-display text-2xl">Nothing to do right now</b>
            </section>
          )}

        </>
      )}
    </main>
  );
}
