import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { Card, ErrorBox, Page } from "../components/ui";
import { friendly, supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

type Row = { rank: number; student_code: string; full_name: string; correct: number; total: number; time_taken_seconds: number };

export default function Leaderboard() {
  const { id } = useParams(); // exam id
  const { student } = useAuth();
  const [rows, setRows] = useState<Row[] | null>(null);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  useEffect(() => {
    supabase.rpc("get_leaderboard", { p_exam: id }).then(({ data, error }) => (error ? setError(friendly(error).replace("You are not allowed to do this", "The leaderboard is not available.")) : setRows(data)));
    supabase.from("exams").select("name").eq("id", id).maybeSingle().then(({ data }) => setName(data?.name ?? ""));
  }, [id]);
  return (
    <Page title={`Leaderboard${name ? ` · ${name}` : ""}`}>
      <ErrorBox>{error}</ErrorBox>
      {rows === null && !error ? <p>Loading…</p> : rows && (
        <Card className="p-0">
          <table className="w-full text-left">
            <thead className="bg-slate-50"><tr><th className="p-3">#</th><th className="p-3">Name</th><th className="p-3">Score</th><th className="p-3">Time</th></tr></thead>
            <tbody>{rows.map((r) => (
              <tr key={r.student_code} className={`border-t border-slate-100 ${r.student_code === student?.student_code ? "bg-blue-50 font-bold" : ""}`}>
                <td className="p-3">{r.rank}</td><td className="p-3">{r.full_name}</td><td className="p-3">{r.correct}/{r.total}</td>
                <td className="p-3">{Math.floor(r.time_taken_seconds / 60)}:{String(r.time_taken_seconds % 60).padStart(2, "0")}</td>
              </tr>))}</tbody>
          </table>
        </Card>
      )}
      <Link to="/" className="mt-6 block text-center text-blue-700 underline">Back to home</Link>
    </Page>
  );
}
