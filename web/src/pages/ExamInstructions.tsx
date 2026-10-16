import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { Button, Card, ErrorBox, Page } from "../components/ui";
import { callFunction, friendly, supabase } from "../lib/supabase";
import type { Exam } from "./admin/Exams";

export type AntiCheat = { ac_fullscreen: boolean; ac_log_leaves: boolean; ac_block_copy: boolean; ac_auto_submit_after: number | null };

export default function ExamInstructions() {
  const { id } = useParams();
  const nav = useNavigate();
  const [exam, setExam] = useState<Exam | null>(null);
  const [ac, setAc] = useState<AntiCheat | null>(null);
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([supabase.from("exams").select("*").eq("id", id).maybeSingle(), supabase.from("settings").select("*").single()])
      .then(([e, s]) => {
        if (e.error || !e.data) return setError(e.error ? friendly(e.error) : "Exam not found");
        setExam(e.data); setAc(s.data);
      });
  }, [id]);

  async function start() {
    setBusy(true); setError("");
    // Full screen needs this click (browser rule). iPhone Safari can't; the exam still works.
    if (ac?.ac_fullscreen) await document.documentElement.requestFullscreen?.().catch(() => {});
    try {
      const r = await callFunction<{ attempt_id: string; status: string }>("start-attempt", { exam_id: id });
      nav(r.status === "in_progress" ? `/attempt/${r.attempt_id}` : `/result/${r.attempt_id}`, { replace: true });
    } catch (e) {
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      setError(friendly(e)); setReady(false);
    } finally {
      setBusy(false);
    }
  }

  if (!exam) return <Page title="Exam"><ErrorBox>{error}</ErrorBox>{!error && <p>Loading…</p>}<Link className="text-indigo-700 underline" to="/">Back to home</Link></Page>;
  const qs = (exam.rules as { quantity: number }[]).reduce((s, r) => s + r.quantity, 0);
  const practice = exam.mode === "practice";

  return (
    <Page title={exam.name}>
      {practice && <p className="-mt-3 mb-4 rounded-lg bg-yellow-300 px-3 py-2 text-center font-bold">PRACTICE: does not count in your result</p>}
      <ErrorBox>{error}</ErrorBox>
      <Card className="mb-4">
        <div className="grid grid-cols-2 gap-3 text-center">
          {[[qs, "Questions"], [`${exam.duration_minutes} min`, "Time"], [qs, "Marks"], [0, "Minus marks"]].map(([v, l]) => (
            <div key={l} className="rounded-xl border border-slate-200 p-3"><b className="block text-2xl">{v}</b>{l}</div>
          ))}
        </div>
      </Card>
      <Card className="mb-4">
        <ul className="list-disc space-y-2 pl-5">
          <li>Type each answer in its box. Press <b>Tab</b> or <b>Enter</b> for the next question.</li>
          <li>Your answers are saved automatically.</li>
          <li>Mixed questions: do × and ÷ first, then + and − (BODMAS).</li>
          <li>When the time is over, the exam is submitted automatically.</li>
          {ac?.ac_log_leaves && <li>Don't leave this screen or switch apps. It is recorded{ac.ac_auto_submit_after ? `, and after ${ac.ac_auto_submit_after} times your exam is submitted` : ""}.</li>}
          {ac?.ac_fullscreen && <li>The exam opens in full screen.</li>}
        </ul>
      </Card>
      <Button className="w-full" onClick={() => setReady(true)}>I'm ready</Button>
      <Link to="/" className="mt-4 block text-center text-indigo-700 underline">Back to home</Link>

      {ready && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm text-center">
            <h2 className="mb-2 text-2xl font-bold">Are you ready?</h2>
            <p className="mb-4">The timer starts now.</p>
            <Button className="w-full" disabled={busy} onClick={start}>{busy ? "Starting…" : "Start"}</Button>
            <Button variant="secondary" className="mt-2 w-full" disabled={busy} onClick={() => setReady(false)}>Cancel</Button>
          </Card>
        </div>
      )}
    </Page>
  );
}
