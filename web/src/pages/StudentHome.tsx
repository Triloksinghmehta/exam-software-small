import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Button, Card, ErrorBox, Icon, LinkButton, Page } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";
import { when, type Exam } from "./admin/Exams";

type Attempt = { id: string; exam_id: string; status: string; correct: number | null; total: number | null; submitted_at: string | null };

function ExamCard({ e, attempts }: { e: Exam; attempts: Attempt[] }) {
  const mine = attempts.filter((a) => a.exam_id === e.id);
  const open = mine.find((a) => a.status === "in_progress");
  const done = mine.filter((a) => a.status !== "in_progress").sort((a, b) => b.submitted_at!.localeCompare(a.submitted_at!));
  const left = e.attempts_allowed - mine.length;
  const now = Date.now();
  const isOpen = e.status === "published" && now >= Date.parse(e.starts_at) && now <= Date.parse(e.ends_at);
  const qs = (e.rules as { quantity: number }[]).reduce((s, r) => s + r.quantity, 0);
  const practice = e.mode === "practice";

  let action;
  if (open) action = <LinkButton to={`/attempt/${open.id}`} className="w-full">Continue</LinkButton>;
  else if (isOpen && left > 0) action = <LinkButton to={`/exam/${e.id}`} className="w-full">{practice ? "Practice" : "Start exam"}</LinkButton>;
  else if (done.length) action = <LinkButton to={`/result/${done[0].id}`} variant="secondary" className="w-full">View result ({done[0].correct}/{done[0].total})</LinkButton>;
  else if (now < Date.parse(e.starts_at)) action = <span className="block w-full rounded-md bg-slate-100 px-4 py-3 text-center font-semibold text-slate-500">Opens {when(e.starts_at)}</span>;
  else action = <span className="block w-full rounded-md bg-slate-100 px-4 py-3 text-center font-semibold text-slate-500">{practice ? "Closed" : "Missed"}</span>;

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-start justify-between gap-2">
        <b className="text-lg leading-snug">{e.name}</b>
        <Badge tone={practice ? "amber" : "indigo"}>{practice ? "Practice" : "Exam"}</Badge>
      </div>
      <ul className="mb-4 space-y-1 text-sm text-slate-600">
        <li className="flex items-center gap-2"><Icon name="exams" className="h-4 w-4" />{qs} questions</li>
        <li className="flex items-center gap-2"><Icon name="clock" className="h-4 w-4" />{e.duration_minutes} minutes{isOpen && <> · open till {when(e.ends_at)}</>}</li>
        {practice && isOpen && !open && <li className="text-slate-500">{Math.max(0, left)} {left === 1 ? "try" : "tries"} left</li>}
      </ul>
      {done.length > 0 && (open || (isOpen && left > 0)) && <Link className="mb-3 text-sm text-indigo-700 underline" to={`/result/${done[0].id}`}>Last result: {done[0].correct}/{done[0].total}</Link>}
      <div className="mt-auto">{action}</div>
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
  const first = student.full_name.split(" ")[0];
  const section = (title: string, list: Exam[], empty?: string) => (
    <section className="mb-8">
      <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">{title}</h2>
      {list.length ? <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{list.map((e) => <ExamCard key={e.id} e={e} attempts={attempts} />)}</div>
        : empty && <Card><p className="text-slate-500">{empty}</p></Card>}
    </section>
  );

  return (
    <Page title={`Hi, ${first}`} wide actions={<LinkButton to="/results" variant="secondary">My results</LinkButton>}>
      {error && <><ErrorBox>{error}</ErrorBox><Button variant="secondary" className="mb-4" onClick={load}>Try again</Button></>}
      {exams === null && !error ? <p className="text-slate-500">Loading…</p> : <>
        {section("Exams", official, "No exams right now. Your teacher will add one.")}
        {practice.length > 0 && section("Practice", practice)}
      </>}
    </Page>
  );
}
