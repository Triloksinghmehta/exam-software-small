import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, ErrorBox, Page } from "../components/ui";
import { QuestionView } from "../components/QuestionView";
import { friendly, supabase } from "../lib/supabase";
import type { Prompt } from "../../../supabase/functions/_shared/generator";

type Result = {
  exam_name: string; mode: string; status: string; total: number; answered: number; correct: number; wrong: number; skipped: number;
  percent: number; started_at: string; submitted_at: string; time_taken_seconds: number;
  questions: { position: number; prompt: Prompt; answer: number | null; correct_answer: number; result: "correct" | "wrong" | "skipped" }[];
};
const time = (s: number) => `${Math.floor(s / 60)} min ${s % 60} sec`;
const clock = (iso: string) => new Date(iso).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" });
const MARK = { correct: ["✓", "text-green-700"], wrong: ["✗", "text-red-700"], skipped: ["–", "text-slate-500"] } as const;

export default function ResultPage() {
  const { id } = useParams();
  const [r, setR] = useState<Result | null>(null);
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.rpc("get_result", { p_attempt: id }).then(({ data, error }) => (error ? setError(friendly(error)) : setR(data)));
  }, [id]);

  if (!r) return <Page title="Result"><ErrorBox>{error}</ErrorBox>{!error && <p>Loading…</p>}<Link className="text-blue-700 underline" to="/">Back to home</Link></Page>;
  return (
    <Page title={r.exam_name}>
      {r.mode === "practice" && <p className="-mt-3 mb-4 rounded-lg bg-yellow-300 px-3 py-2 text-center font-bold">PRACTICE result</p>}
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
          const [icon, cls] = MARK[q.result];
          return (
            <Card key={q.position}>
              <div className="flex justify-between"><span className="text-sm text-slate-500">Q{q.position}</span><b className={`text-xl ${cls}`} aria-label={q.result}>{icon}</b></div>
              <div className="my-2 text-right"><QuestionView prompt={q.prompt} /></div>
              <p>Your answer: <b className={cls}>{q.answer ?? "—"}</b></p>
              {q.result !== "correct" && <p>Correct answer: <b className="text-green-700">{q.correct_answer}</b></p>}
            </Card>
          );
        })}
      </div>
      <Link to="/" className="mt-6 block rounded-xl bg-blue-600 px-4 py-3 text-center text-lg font-semibold text-white">Back to home</Link>
    </Page>
  );
}
