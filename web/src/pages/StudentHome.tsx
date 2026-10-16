import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Button, Card, ErrorBox, Page } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { when, type Exam } from "./admin/Exams";

type Attempt = { id: string; exam_id: string; status: string; correct: number | null; total: number | null; submitted_at: string | null };

const btn = "mt-3 block w-full rounded-xl px-4 py-3 text-center text-lg font-semibold";
const primary = `${btn} bg-blue-600 text-white hover:bg-blue-700`;
const secondary = `${btn} border-2 border-blue-600 text-blue-700`;
const disabled = `${btn} bg-slate-200 text-slate-500`;

function ExamCard({ e, attempts }: { e: Exam; attempts: Attempt[] }) {
  const mine = attempts.filter((a) => a.exam_id === e.id);
  const open = mine.find((a) => a.status === "in_progress");
  const done = mine.filter((a) => a.status !== "in_progress").sort((a, b) => b.submitted_at!.localeCompare(a.submitted_at!));
  const left = e.attempts_allowed - mine.length;
  const now = Date.now();
  const isOpen = e.status === "published" && now >= Date.parse(e.starts_at) && now <= Date.parse(e.ends_at);
  const qs = (e.rules as { quantity: number }[]).reduce((s, r) => s + r.quantity, 0);

  let action;
  if (open) action = <Link className={primary} to={`/attempt/${open.id}`}>Continue</Link>;
  else if (isOpen && left > 0) action = <Link className={primary} to={`/exam/${e.id}`}>{e.mode === "practice" ? "Practice" : "Start"}</Link>;
  else if (done.length) action = <Link className={secondary} to={`/result/${done[0].id}`}>View result ({done[0].correct}/{done[0].total})</Link>;
  else if (now < Date.parse(e.starts_at)) action = <span className={disabled}>Opens {when(e.starts_at)}</span>;
  else action = <span className={disabled}>{e.mode === "official" ? "Missed" : "Closed"}</span>;

  return (
    <Card className="mb-3">
      <div className="flex items-start justify-between gap-2">
        <b className="text-lg">{e.name}</b>
        {e.mode === "practice" && <span className="rounded-full bg-yellow-300 px-2 py-0.5 text-xs font-bold">PRACTICE</span>}
      </div>
      <p className="text-slate-600">{qs} questions · {e.duration_minutes} min{isOpen && <> · open till {when(e.ends_at)}</>}</p>
      {e.mode === "practice" && isOpen && !open && <p className="text-sm text-slate-500">{Math.max(0, left)} {left === 1 ? "try" : "tries"} left</p>}
      {done.length > 0 && (open || (isOpen && left > 0)) && <Link className="mt-2 inline-block text-blue-700 underline" to={`/result/${done[0].id}`}>Last result: {done[0].correct}/{done[0].total}</Link>}
      {action}
    </Card>
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

  // Hide exams closed more than 30 days ago that I never attempted
  const recent = (exams ?? []).filter((e) => Date.parse(e.ends_at) > Date.now() - 30 * 86400000 || attempts.some((a) => a.exam_id === e.id));
  const official = recent.filter((e) => e.mode === "official");
  const practice = recent.filter((e) => e.mode === "practice");

  return (
    <Page title="Home">
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <b className="text-lg">{student.full_name}</b>
            <p className="text-slate-600">{student.student_code} · Level {student.level}</p>
          </div>
          <Button variant="secondary" onClick={() => supabase.auth.signOut()}>Logout</Button>
        </div>
      </Card>
      {error && <><ErrorBox>{error}</ErrorBox><Button variant="secondary" className="mb-4" onClick={load}>Try again</Button></>}
      {exams === null && !error ? <p>Loading…</p> : <>
        <h2 className="mb-2 text-xl font-bold">Exams</h2>
        {official.length ? official.map((e) => <ExamCard key={e.id} e={e} attempts={attempts} />)
          : <Card className="mb-3"><p className="text-slate-600">No exams right now. Your teacher will add one.</p></Card>}
        {practice.length > 0 && <>
          <h2 className="mb-2 mt-6 text-xl font-bold">Practice</h2>
          {practice.map((e) => <ExamCard key={e.id} e={e} attempts={attempts} />)}
        </>}
        <Link to="/results" className="mt-6 block text-center text-blue-700 underline">My results</Link>
      </>}
    </Page>
  );
}
