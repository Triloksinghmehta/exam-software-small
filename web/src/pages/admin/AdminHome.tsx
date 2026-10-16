import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, Page } from "../../components/ui";
import { supabase } from "../../lib/supabase";

export default function AdminHome() {
  const [count, setCount] = useState<number | null>(null);
  useEffect(() => {
    supabase.from("students").select("id", { count: "exact", head: true }).then(({ count }) => setCount(count ?? 0));
  }, []);
  const big = "block rounded-xl bg-blue-600 px-4 py-4 text-center text-lg font-semibold text-white hover:bg-blue-700";
  return (
    <Page title="Admin Home" wide>
      <div className="grid gap-4 sm:grid-cols-2">
        <Card><p className="text-slate-600">Students</p><b className="text-3xl">{count ?? "…"}</b></Card>
        <Card><p className="text-slate-600">Exams</p><b className="text-3xl">—</b><p className="text-sm text-slate-500">Coming in the next step (G4)</p></Card>
      </div>
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <Link className={big} to="/admin/students/import">Add students (CSV)</Link>
        <Link className={big} to="/admin/students">Students list</Link>
      </div>
    </Page>
  );
}
