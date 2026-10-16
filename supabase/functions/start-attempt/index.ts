// Student starts (or resumes) an exam. The database decides eligibility and timing (begin_attempt);
// this function only makes the student's own paper once, using the shared generator (ADR-0003).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { generatePaper, RuleError, type Rule } from "../_shared/generator.ts";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json("ok");
  let examId: string;
  try { ({ exam_id: examId } = await req.json()); } catch { return json({ error: "Bad JSON" }, 400); }
  if (!examId) return json({ error: "exam_id required" }, 400);

  const url = Deno.env.get("SUPABASE_URL")!;
  const student = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  // Runs as the student: checks level, window, tries, session; returns new or open attempt
  const { data: attempt, error } = await student.rpc("begin_attempt", { p_exam: examId });
  if (error) return json({ error: error.message }, 400);
  if (attempt.status !== "in_progress") return json({ attempt_id: attempt.id, status: attempt.status });

  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });
  const { count } = await db.from("attempt_questions").select("position", { count: "exact", head: true }).eq("attempt_id", attempt.id);
  if (!count) {
    const { data: exam } = await db.from("exams").select("rules").eq("id", examId).single();
    let paper;
    try {
      paper = generatePaper(exam!.rules as Rule[]);
    } catch (e) {
      return json({ error: e instanceof RuleError ? "PAPER_RULES_INVALID" : String(e) }, 500);
    }
    // One insert = all or nothing. A parallel request may win the race (primary key); that's fine.
    const { error: insErr } = await db.from("attempt_questions").insert(
      paper.map((q, i) => ({ attempt_id: attempt.id, position: i + 1, kind: q.kind, prompt: q.prompt, correct_answer: q.answer })),
    );
    if (insErr && insErr.code !== "23505") return json({ error: insErr.message }, 500);
  }
  return json({ attempt_id: attempt.id, status: attempt.status });
});
