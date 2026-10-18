import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Badge, Button, Card, ErrorBox, Field, Icon, Page, useConfirm, levelName } from "../../components/ui";
import { RulesEditor, rulesError } from "../../components/RulesEditor";
import { friendly, supabase } from "../../lib/supabase";
import { GENERATOR_VERSION, type Rule } from "../../../../supabase/functions/_shared/generator";
import { examState, type Exam } from "./Exams";

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const DAY = 86400000;
// ISO -> value for <input type="datetime-local"> in the browser's time zone (IST in India)
const toLocal = (iso: string) => { const d = new Date(iso); return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16); };
const inHour = () => { const d = new Date(Date.now() + 3600000); d.setMinutes(0, 0, 0); return d.toISOString(); };

export default function ExamEditor() {
  const { id } = useParams();
  const isNew = !id;
  const [params] = useSearchParams();
  const nav = useNavigate();
  const [f, setF] = useState({
    name: "", mode: (params.get("mode") ?? "official") as Exam["mode"], level: 0,
    starts_at: toLocal(inHour()), ends_at: toLocal(new Date(Date.parse(inHour()) + DAY).toISOString()),
    duration_minutes: 8, attempts_allowed: 1,
  });
  const [rules, setRules] = useState<Rule[]>([]);
  const [levelInfo, setLevelInfo] = useState(false);
  const [exam, setExam] = useState<Exam | null>(null);
  const [started, setStarted] = useState(0); // attempts so far -> rules locked
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [ask, dialog] = useConfirm();

  async function loadLevelRules(level: number) {
    const { data } = await supabase.from("levels").select("default_rules, duration_minutes").eq("level", level).single();
    setRules((data?.default_rules ?? []) as Rule[]);
    if (data?.duration_minutes) setF((p) => ({ ...p, duration_minutes: data.duration_minutes })); // level's time limit
  }

  useEffect(() => {
    const copy = params.get("copy");
    if (isNew && copy) { // "Use again": same name, level, time and rules; fresh dates; saved only when the admin presses a save button
      supabase.from("exams").select("*").eq("id", copy).single().then(({ data: e, error }) => {
        if (error) return setError(friendly(error));
        setF((p) => ({ ...p, name: `${e.name} (copy)`, mode: e.mode, level: e.level, duration_minutes: e.duration_minutes, attempts_allowed: e.attempts_allowed }));
        setRules(e.rules as Rule[]);
      });
      return;
    }
    if (isNew) { loadLevelRules(0); return; }
    (async () => {
      const { data: e, error } = await supabase.from("exams").select("*").eq("id", id).single();
      if (error) return setError(friendly(error));
      setExam(e);
      setF({ name: e.name, mode: e.mode, level: e.level, starts_at: toLocal(e.starts_at), ends_at: toLocal(e.ends_at), duration_minutes: e.duration_minutes, attempts_allowed: e.attempts_allowed });
      setRules(e.rules as Rule[]);
      const { count } = await supabase.from("attempts").select("id", { count: "exact", head: true }).eq("exam_id", id);
      setStarted(count ?? 0);
    })();
  }, [id]);

  const locked = started > 0;
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) =>
    setF({ ...f, [k]: ["level", "duration_minutes", "attempts_allowed"].includes(k) ? Number(e.target.value) : e.target.value });

  function check(): string | null {
    if (!f.name.trim()) return "Please give the exam a name";
    const s = Date.parse(f.starts_at), en = Date.parse(f.ends_at);
    if (!(en > s)) return "Closing time must be after opening time";
    if (!(f.duration_minutes >= 1 && f.duration_minutes <= 300)) return "Time must be 1 to 300 minutes";
    if (!(f.attempts_allowed >= 1 && f.attempts_allowed <= 100)) return "Tries allowed must be 1 to 100";
    return rulesError(rules);
  }

  async function save(status: Exam["status"]) {
    setError("");
    const problem = check();
    if (problem) return setError(problem);
    setBusy(true);
    const row = {
      ...f, name: f.name.trim(), rules, status, generator_version: GENERATOR_VERSION,
      starts_at: new Date(f.starts_at).toISOString(), ends_at: new Date(f.ends_at).toISOString(),
    };
    const { data, error } = isNew
      ? await supabase.from("exams").insert(row).select().single()
      : await supabase.from("exams").update(locked ? { name: row.name, ends_at: row.ends_at, status } : row).eq("id", id!).select().single();
    setBusy(false);
    if (error) return setError(error.message.includes("EXAM_LOCKED") ? "Students have started this exam. Only the name and a later closing time can change." : friendly(error));
    nav(`/admin/exams/${data.id}`, { replace: true });
    setExam(data);
  }

  async function setStatus(status: Exam["status"], title: string, message: string, yes: string, tone?: "danger") {
    if (!(await ask({ title, message, yes, tone }))) return;
    const { data, error } = await supabase.from("exams").update({ status }).eq("id", id!).select().single();
    if (error) setError(friendly(error)); else setExam(data);
  }

  const state = exam && examState(exam);
  return (
    <Page title={isNew ? "Create exam" : exam?.name ?? "Exam"} wide>
      {state && <p className="-mt-3 mb-4"><Badge tone={state.tone}>{state.label}</Badge>
        {locked && <span className="ml-2 text-slate-600">{started} student{started > 1 ? "s have" : " has"} started. Rules are locked.</span>}</p>}
      {exam && <Link className="-mt-2 mb-4 inline-block text-indigo-700 underline" to={`/admin/exams/${exam.id}/results`}>View results and leaderboard</Link>}
      <div className="sticky top-16 z-[5] -mx-1 mb-4 flex flex-wrap items-center gap-x-6 gap-y-1 rounded-xl bg-gradient-to-b from-indigo-500 to-indigo-600 px-5 py-3 text-white shadow-md md:top-2">
        <span className="font-display text-xl font-medium">{levelName(f.level)}</span>
        <span className="text-sm text-white/80">{f.mode === "practice" ? "Practice" : "Official exam"}</span>
        <span className="flex items-center gap-1.5 text-sm text-white/80"><Icon name="clock" className="h-4 w-4" />{f.duration_minutes} min</span>
        <span className="flex items-center gap-1.5 text-sm text-white/80"><Icon name="exams" className="h-4 w-4" />{rules.reduce((n, r) => n + (r.quantity || 0), 0)} questions</span>
      </div>
      <ErrorBox>{error}</ErrorBox>
      <Card className="mb-4">
        <div className="grid gap-x-4 sm:grid-cols-2">
          <div className="sm:col-span-2"><Field label="Exam name" value={f.name} onChange={set("name")} placeholder="October Level 3 Exam" /></div>
          <label className="block mb-4"><span className="block mb-1 font-medium">Type</span>
            <select disabled={locked} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg" value={f.mode} onChange={set("mode")}>
              <option value="official">Official exam</option><option value="practice">Practice</option>
            </select></label>
          <label className="relative block mb-4"><span className="mb-1 flex items-center gap-1.5 font-medium">Level<button type="button" aria-label="About levels" aria-expanded={levelInfo} onClick={() => setLevelInfo(!levelInfo)} onBlur={() => setLevelInfo(false)} className="grid h-5 w-5 place-items-center rounded-full text-indigo-600 hover:bg-indigo-50"><Icon name="info" className="h-5 w-5" /></button></span>{levelInfo && <span role="note" className="absolute left-0 top-7 z-10 w-72 rounded-xl border border-indigo-200 bg-white p-3 text-sm font-normal text-slate-700 shadow-lg"><b className="text-indigo-700">One exam is for one level only.</b> Only students of this level will see it. To cover other levels, create a separate exam for each.</span>}
            <select disabled={locked} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg" value={f.level}
              onChange={async (e) => {
                const lv = Number(e.target.value);
                set("level")(e);
                if (locked) return;
                if (isNew || await ask({ title: `Switch to ${levelName(lv)} rules?`, message: "The question rules and time limit will be replaced with this level's defaults. Your own changes to the rules will be lost.", yes: "Use level defaults", no: "Keep my rules" })) loadLevelRules(lv);
              }}>
              {LEVELS.map((l) => <option key={l} value={l}>{levelName(l)}</option>)}
            </select></label>
          <Field label="Opens at" type="datetime-local" disabled={locked} value={f.starts_at} onChange={set("starts_at")} />
          <Field label="Closes at" type="datetime-local" value={f.ends_at} onChange={set("ends_at")} />
          <Field label="Time for the exam (minutes)" type="number" min={1} max={300} disabled={locked} value={f.duration_minutes} onChange={set("duration_minutes")} />
          <Field label="Tries allowed per student" type="number" min={1} max={100} disabled={locked} value={f.attempts_allowed} onChange={set("attempts_allowed")} />
        </div>
      </Card>
      <Card className="mb-4">
        <h2 className="mb-2 text-xl font-bold">Question rules</h2>
        <RulesEditor rules={rules} onChange={setRules} locked={locked} />
      </Card>
      <div className="flex flex-wrap gap-2">
        {(isNew || exam?.status === "draft") && <>
          <Button variant="secondary" disabled={busy} onClick={() => save("draft")}>Save draft</Button>
          <Button disabled={busy} onClick={() => save("published")}>Publish</Button>
        </>}
        {exam?.status === "published" && <>
          <Button disabled={busy} onClick={() => save("published")}>Save changes</Button>
          {!locked && <Button variant="secondary" onClick={() => setStatus("draft", "Unpublish this exam?", "Students will no longer see it until you publish it again.", "Unpublish")}>Unpublish</Button>}
          <Button variant="danger" onClick={() => setStatus("closed", "Close this exam now?", "No new student will be able to start it.", "Close exam", "danger")}>Close now</Button>
        </>}
        {exam?.status === "closed" && <Button variant="secondary" onClick={() => setStatus("published", "Open this exam again?", "Students will be able to start it again.", "Reopen")}>Reopen</Button>}
      </div>
    {dialog}
    </Page>
  );
}
