import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, Icon, LinkButton, Page, StatCard } from "../../components/ui";
import { supabase } from "../../lib/supabase";
import { when, type Exam } from "./Exams";

type Recent = { id: string; correct: number; total: number; submitted_at: string; students: { full_name: string; student_code: string } | null; exams: { name: string; mode: string } | null };

export default function AdminHome() {
  const [stats, setStats] = useState<{ students: number; open: number; writing: number; today: number } | null>(null);
  const [openExams, setOpenExams] = useState<Exam[]>([]);
  const [recent, setRecent] = useState<Recent[]>([]);

  useEffect(() => {
    const now = new Date().toISOString();
    const midnight = new Date(new Date().setHours(0, 0, 0, 0)).toISOString();
    const head = { count: "exact" as const, head: true };
    Promise.all([
      supabase.from("students").select("id", head),
      supabase.from("exams").select("*").eq("status", "published").lte("starts_at", now).gte("ends_at", now).order("ends_at").limit(5),
      supabase.from("attempts").select("id", head).eq("status", "in_progress"),
      supabase.from("attempts").select("id", head).neq("status", "in_progress").gte("submitted_at", midnight),
      supabase.from("attempts").select("id, correct, total, submitted_at, students(full_name, student_code), exams(name, mode)").neq("status", "in_progress").order("submitted_at", { ascending: false }).limit(6),
    ]).then(([s, e, w, t, r]) => {
      setStats({ students: s.count ?? 0, open: e.data?.length ?? 0, writing: w.count ?? 0, today: t.count ?? 0 });
      setOpenExams((e.data ?? []) as Exam[]);
      setRecent((r.data ?? []) as unknown as Recent[]);
    });
  }, []);

  const v = (n?: number) => (stats ? n : "…");
  return (
    <Page title="Dashboard" wide actions={<div className="flex gap-2"><LinkButton to="/admin/students/import" variant="secondary">Add students</LinkButton><LinkButton to="/admin/exams/new">+ Create exam</LinkButton></div>}>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Students" value={v(stats?.students)} icon={<Icon name="students" className="h-6 w-6" />} />
        <StatCard label="Exams open now" value={v(stats?.open)} tone="emerald" icon={<Icon name="exams" className="h-6 w-6" />} />
        <StatCard label="Writing right now" value={v(stats?.writing)} tone="amber" icon={<Icon name="pencil" className="h-6 w-6" />} />
        <StatCard label="Submitted today" value={v(stats?.today)} tone="sky" icon={<Icon name="check" className="h-6 w-6" />} />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-5">
        <Card className="min-w-0 lg:col-span-2">
          <h2 className="mb-4 text-lg font-bold">Open exams</h2>
          {!openExams.length ? <p className="text-slate-500">No exam is open right now.</p> : (
            <ul className="space-y-3">
              {openExams.map((e) => (
                <li key={e.id}>
                  <Link to={`/admin/exams/${e.id}/results`} className="block rounded-xl border border-slate-200 p-3 transition hover:border-indigo-300 hover:bg-indigo-50/40">
                    <div className="flex items-center justify-between gap-2"><b>{e.name}</b><Badge tone={e.mode === "practice" ? "amber" : "indigo"}>{e.mode === "practice" ? "Practice" : "Official"}</Badge></div>
                    <p className="mt-1 flex items-center gap-1 text-sm text-slate-500"><Icon name="clock" className="h-4 w-4" />Level {e.level} · closes {when(e.ends_at)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="min-w-0 p-0 lg:col-span-3">
          <h2 className="p-5 pb-3 text-lg font-bold">Latest submissions</h2>
          {!recent.length ? <p className="px-5 pb-5 text-slate-500">Nothing submitted yet.</p> : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead><tr>{["Student", "Exam", "Score", "When"].map((h) => <th key={h} className="px-5 py-2">{h}</th>)}</tr></thead>
                <tbody>
                  {recent.map((r) => (
                    <tr key={r.id} className="border-t border-slate-100">
                      <td className="px-5 py-3"><b className="block">{r.students?.full_name}</b><span className="text-xs text-slate-500">{r.students?.student_code}</span></td>
                      <td className="px-5 py-3">{r.exams?.name}</td>
                      <td className="px-5 py-3"><b>{r.correct}/{r.total}</b></td>
                      <td className="px-5 py-3 text-slate-500">{when(r.submitted_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </Page>
  );
}
