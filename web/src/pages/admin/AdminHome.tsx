import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Badge, Card, LinkButton, Page, StatStrip, levelName } from "../../components/ui";
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
      supabase.from("exams").select("*").eq("status", "published").lte("starts_at", now).gte("ends_at", now).order("ends_at").limit(6),
      supabase.from("attempts").select("id", head).eq("status", "in_progress"),
      supabase.from("attempts").select("id", head).neq("status", "in_progress").gte("submitted_at", midnight),
      supabase.from("attempts").select("id, correct, total, submitted_at, students(full_name, student_code), exams(name, mode)").neq("status", "in_progress").order("submitted_at", { ascending: false }).limit(8),
    ]).then(([s, e, w, t, r]) => {
      setStats({ students: s.count ?? 0, open: e.data?.length ?? 0, writing: w.count ?? 0, today: t.count ?? 0 });
      setOpenExams((e.data ?? []) as Exam[]);
      setRecent((r.data ?? []) as unknown as Recent[]);
    });
  }, []);

  const v = (n?: number) => (stats ? n : "–");
  const today = new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" });
  return (
    <Page title="Dashboard" eyebrow={today} wide actions={<div className="flex gap-2"><LinkButton to="/admin/students/import" variant="secondary">Add students</LinkButton><LinkButton to="/admin/exams/new">Create exam</LinkButton></div>}>
      <StatStrip items={[
        { label: "Students", value: v(stats?.students), hint: "Registered" },
        { label: "Open exams", value: v(stats?.open), hint: "Available right now" },
        { label: "Writing now", value: v(stats?.writing), hint: "In progress" },
        { label: "Submitted today", value: v(stats?.today), hint: "Since midnight" },
      ]} />

      <div className="mt-8 grid gap-8 lg:grid-cols-5">
        <section className="min-w-0 lg:col-span-2">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Open exams</h2>
          <Card className="p-0">
            {!openExams.length ? <p className="p-5 text-sm text-slate-500">No exam is open right now.</p> : (
              <ul className="divide-y divide-slate-200">
                {openExams.map((e) => (
                  <li key={e.id}>
                    <Link to={`/admin/exams/${e.id}/results`} className="block px-5 py-4 transition-colors hover:bg-slate-100/60">
                      <div className="flex items-start justify-between gap-3">
                        <b className="font-medium leading-snug">{e.name}</b>
                        <Badge tone={e.mode === "practice" ? "amber" : "indigo"}>{e.mode === "practice" ? "Practice" : "Official"}</Badge>
                      </div>
                      <p className="mt-1 text-[13px] text-slate-500">{levelName(e.level)} · closes {when(e.ends_at)}</p>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </section>

        <section className="min-w-0 lg:col-span-3">
          <h2 className="mb-3 text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Latest submissions</h2>
          <Card className="p-0">
            {!recent.length ? <p className="p-5 text-sm text-slate-500">Nothing submitted yet.</p> : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead><tr>{["Student", "Exam", "Score", "When"].map((h) => <th key={h} className="px-5 py-3">{h}</th>)}</tr></thead>
                  <tbody>
                    {recent.map((r) => (
                      <tr key={r.id} className="border-t border-slate-100 first:border-t-0">
                        <td className="px-5 py-3"><b className="block font-medium">{r.students?.full_name}</b><span className="text-xs text-slate-500">{r.students?.student_code}</span></td>
                        <td className="px-5 py-3 text-slate-700">{r.exams?.name}</td>
                        <td className="px-5 py-3 font-medium">{r.correct}<span className="text-slate-400">/{r.total}</span></td>
                        <td className="whitespace-nowrap px-5 py-3 text-slate-500">{when(r.submitted_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </section>
      </div>
    </Page>
  );
}
