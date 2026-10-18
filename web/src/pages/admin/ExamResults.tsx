import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Button, Card, ErrorBox, Icon, Page, Segmented, download, toCsv, Toggle, levelName } from "../../components/ui";
import { friendly, supabase } from "../../lib/supabase";
import { when, type Exam } from "./Exams";

type Attempt = {
  id: string; student_id: string; attempt_no: number; status: string; correct: number | null; wrong: number | null; skipped: number | null;
  total: number | null; started_at: string; submitted_at: string | null; leave_count: number;
  students: { student_code: string; full_name: string; father_name: string } | null;
};
type Student = { id: string; student_code: string; full_name: string; father_name: string };
type Board = { rank: number; student_code: string; full_name: string; correct: number; total: number; time_taken_seconds: number }[];

const secs = (a: Attempt) => (a.submitted_at ? Math.round((Date.parse(a.submitted_at) - Date.parse(a.started_at)) / 1000) : null);
const fmtTime = (s: number | null) => (s == null ? "—" : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`);
const STATUS: Record<string, string> = { in_progress: "Writing now", submitted: "Submitted", auto_submitted: "Auto-submitted" };

export default function ExamResults() {
  const { id } = useParams();
  const [exam, setExam] = useState<Exam | null>(null);
  const [attempts, setAttempts] = useState<Attempt[]>([]);
  const [absent, setAbsent] = useState<Student[]>([]);
  const [board, setBoard] = useState<Board>([]);
  const [tab, setTab] = useState<"results" | "board">("results");
  const [error, setError] = useState("");
  const [loaded, setLoaded] = useState(false);

  async function load() {
    const { data: e, error: e1 } = await supabase.from("exams").select("*").eq("id", id).single();
    if (e1) return setError(friendly(e1));
    setExam(e);
    const [a, s, b] = await Promise.all([
      supabase.from("attempts").select("*, students(student_code, full_name, father_name)").eq("exam_id", id).order("started_at"),
      supabase.from("students").select("id, student_code, full_name, father_name").eq("level", e.level).eq("status", "active").order("student_code"),
      e.mode === "official" ? supabase.rpc("get_leaderboard", { p_exam: id }) : Promise.resolve({ data: [], error: null }),
    ]);
    const err = a.error ?? s.error ?? b.error;
    if (err) return setError(friendly(err));
    setAttempts(a.data as unknown as Attempt[]);
    const seen = new Set((a.data ?? []).map((x) => x.student_id));
    setAbsent((s.data ?? []).filter((x) => !seen.has(x.id)));
    setBoard(b.data as Board);
    setLoaded(true);
  }
  useEffect(() => { load(); }, [id]);

  async function toggleBoard() {
    const { error } = await supabase.from("exams").update({ leaderboard_public: !exam!.leaderboard_public }).eq("id", id!);
    if (error) setError(friendly(error)); else load();
  }

  function exportCsv() {
    const rows = attempts.map((a) => [a.students?.student_code, a.students?.full_name, a.students?.father_name, a.attempt_no, STATUS[a.status], a.correct, a.wrong, a.skipped, a.total,
      a.total ? Math.round((1000 * a.correct!) / a.total) / 10 : "", fmtTime(secs(a)), a.started_at, a.submitted_at ?? "", a.leave_count]);
    const gone = absent.map((s) => [s.student_code, s.full_name, s.father_name, "", "Absent", "", "", "", "", "", "", "", "", ""]);
    download(`${exam!.name}-results.csv`, toCsv([["student_id", "name", "father_name", "try", "status", "correct", "wrong", "skipped", "total", "percent", "time_mm:ss", "started_at", "submitted_at", "left_screen_times"], ...rows, ...gone]));
  }

  const th = "p-3";

  return (
    <Page title={exam?.name ?? "Results"} wide>
      <ErrorBox>{error}</ErrorBox>
      {exam && <p className="-mt-3 mb-4 text-slate-600">{levelName(exam.level)} · {when(exam.starts_at)} to {when(exam.ends_at)} · <Link aria-label="Edit exam" title="Edit exam" to={`/admin/exams/${exam.id}`} className="ml-1 inline-grid h-8 w-8 place-items-center rounded-lg border border-slate-300 bg-white align-middle text-indigo-700 transition hover:border-indigo-600 hover:bg-indigo-600/5"><Icon name="pencil" className="h-4 w-4" /></Link></p>}
      <div className="mb-4 flex flex-wrap gap-2">
        <Segmented value={tab} onChange={setTab} options={exam?.mode === "official" ? [["results", "Results"], ["board", "Leaderboard"]] : [["results", "Results"]]} />
        <Button variant="secondary" className="ml-auto" disabled={!attempts.length} onClick={exportCsv}>Download CSV</Button>
      </div>

      {!loaded && !error ? <p>Loading…</p> : tab === "results" ? (
        !attempts.length && !absent.length ? <Card><p>No students at this level yet.</p></Card> :
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr>{["ID", "Name", "Try", "Score", "Correct", "Wrong", "Skipped", "Time", "Status", "Left screen"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
            <tbody>
              {attempts.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className={`${th} font-mono`}>{a.students?.student_code}</td><td className={th}>{a.students?.full_name}</td><td className={th}>{a.attempt_no}</td>
                  <td className={th}>{a.status === "in_progress" ? "—" : <b>{a.correct}/{a.total}</b>}</td>
                  <td className={th}>{a.correct ?? ""}</td><td className={th}>{a.wrong ?? ""}</td><td className={th}>{a.skipped ?? ""}</td>
                  <td className={th}>{fmtTime(secs(a))}</td><td className={th}>{STATUS[a.status]}</td>
                  <td className={`${th} ${a.leave_count ? "font-bold text-red-700" : ""}`}>{a.leave_count ? `${a.leave_count}×` : "0"}</td>
                </tr>
              ))}
              {absent.map((s) => (
                <tr key={s.id} className="border-t border-slate-100 text-slate-500">
                  <td className={`${th} font-mono`}>{s.student_code}</td><td className={th}>{s.full_name}</td><td className={th} colSpan={6} /><td className={th}>{Date.now() > Date.parse(exam!.ends_at) ? "Absent" : "Not started"}</td><td className={th} />
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      ) : (
        <>
          <Card className="mb-4">
            <label className="flex items-center justify-between gap-3">
              <span><b>Show leaderboard to students</b><br /><span className="text-slate-600">Students of this level will see the ranking on their result page.</span></span>
              <Toggle checked={!!exam?.leaderboard_public} onChange={toggleBoard} />
            </label>
          </Card>
          {!board.length ? <Card><p>No submitted attempts yet.</p></Card> :
            <Card className="overflow-x-auto p-0">
              <table className="w-full text-left text-sm">
                <thead className="bg-slate-50"><tr>{["Rank", "ID", "Name", "Score", "Time"].map((h) => <th key={h} className={th}>{h}</th>)}</tr></thead>
                <tbody>{board.map((r) => (
                  <tr key={r.student_code} className="border-t border-slate-100">
                    <td className={th}><b>{r.rank}</b></td><td className={`${th} font-mono`}>{r.student_code}</td><td className={th}>{r.full_name}</td>
                    <td className={th}>{r.correct}/{r.total}</td><td className={th}>{fmtTime(r.time_taken_seconds)}</td>
                  </tr>))}
                </tbody>
              </table>
            </Card>}
          <p className="mt-2 text-sm text-slate-600">Ties: more correct first, then less time, then earlier submit. Same on all = same rank. Best try counts.</p>
        </>
      )}
    </Page>
  );
}
