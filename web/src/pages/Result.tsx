import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, ErrorBox, Icon, Page } from "../components/ui";
import { QuestionView } from "../components/QuestionView";
import { friendly, supabase } from "../lib/supabase";
import type { Prompt } from "../../../supabase/functions/_shared/generator";

type Result = {
  leaderboard_available: boolean;
  exam_name: string; mode: string; status: string; total: number; answered: number; correct: number; wrong: number; skipped: number;
  percent: number; started_at: string; submitted_at: string; time_taken_seconds: number;
  questions: { position: number; prompt: Prompt; answer: number | null; correct_answer: number; result: "correct" | "wrong" | "skipped" }[];
};
const time = (s: number) => `${Math.floor(s / 60)} min ${s % 60} sec`;
const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const MARK = {
  correct: ["check", "text-emerald-700", "bg-emerald-100"],
  wrong: ["x", "text-red-700", "bg-red-100"],
  skipped: ["minus", "text-slate-500", "bg-slate-100"],
} as const;

export default function ResultPage() {
  const { id } = useParams();
  const [r, setR] = useState<Result | null>(null);
  const [examId, setExamId] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.rpc("get_result", { p_attempt: id }).then(({ data, error }) => (error ? setError(friendly(error)) : setR(data)));
    supabase.from("attempts").select("exam_id").eq("id", id).maybeSingle().then(({ data }) => setExamId(data?.exam_id ?? ""));
  }, [id]);

  if (!r) return <Page title="Result"><ErrorBox>{error}</ErrorBox>{!error && <p>Loading…</p>}<Link className="text-indigo-700 underline" to="/">Back to home</Link></Page>;
  return (
    <Page title={r.exam_name}>
      {r.mode === "practice" && <p className="-mt-3 mb-4 rounded-lg bg-brass-400 px-3 py-2 text-center font-bold">PRACTICE result</p>}
      <Card className="mb-4 text-center">
        <p className="text-4xl font-bold">{r.correct} / {r.total}</p>
        <p className="text-xl text-slate-600">{r.percent}%</p>
      </Card>
      <div className="mb-4 grid grid-cols-2 gap-3 text-center">
        <Card><b className="block text-2xl text-green-700">{r.correct}</b>Correct</Card>
        <Card><b className="block text-2xl text-red-700">{r.wrong}</b>Wrong</Card>
        <Card><b className="block text-2xl">{r.skipped}</b>Skipped</Card>
        <Card><b className="block text-2xl">{r.answered}</b>Answered</Card>
      </div>
      <Card className="mb-4">
        <p>Time taken: <b>{time(r.time_taken_seconds)}</b></p>
        <p>Started {clock(r.started_at)} · Submitted {clock(r.submitted_at)}</p>
        <p>{r.status === "auto_submitted" ? "Submitted automatically" : "Submitted by you"}</p>
      </Card>
      <h2 className="mb-2 text-xl font-bold">Your answers</h2>
      <div className="grid gap-3 sm:grid-cols-2">
        {r.questions.map((q) => {
          const [icon, cls, bg] = MARK[q.result];
          return (
            <Card key={q.position}>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Q{q.position}</span><span className={`grid h-7 w-7 place-items-center rounded-full ${bg} ${cls}`} role="img" aria-label={q.result}><Icon name={icon} className="h-4 w-4" /></span></div>
              <div className="my-2 text-right"><QuestionView prompt={q.prompt} /></div>
              <p>Your answer: <b className={cls}>{q.answer ?? "—"}</b></p>
              {q.result !== "correct" && <p>Correct answer: <b className="text-green-700">{q.correct_answer}</b></p>}
            </Card>
          );
        })}
      </div>
      {r.leaderboard_available && examId && <Link to={`/leaderboard/${examId}`} className="mt-6 block rounded-md border-2 border-indigo-600 px-4 py-3 text-center text-lg font-semibold text-indigo-700">See leaderboard</Link>}
      <Link to="/" className="mt-4 block rounded-md bg-indigo-600 px-4 py-3 text-center text-lg font-semibold text-white">Back to home</Link>
    </Page>
  );
}
