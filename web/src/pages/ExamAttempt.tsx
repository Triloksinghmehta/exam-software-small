import { useCallback, useEffect, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button, Card, ErrorBox, Icon } from "../components/ui";
import { QuestionView } from "../components/QuestionView";
import { friendly, supabase } from "../lib/supabase";
import type { Prompt } from "../../../supabase/functions/_shared/generator";
import type { AntiCheat } from "./ExamInstructions";

type Paper = { attempt_id: string; status: string; deadline_at: string; server_now: string; questions: { position: number; prompt: Prompt; answer: number | null }[] };
type SaveState = "saved" | "saving" | "offline";

// Typed text -> what we send. "12." -> 12, "" -> null, anything else odd -> null (not answered)
const toAnswer = (s: string) => { const t = s.replace(/\.$/, ""); return /^\d+(\.\d+)?$/.test(t) ? t : null; };
const mmss = (ms: number) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };

export default function ExamAttempt() {
  const { id } = useParams();
  const nav = useNavigate();
  const storeKey = `answers:${id}`; // unsent answers survive refresh / going offline
  const [paper, setPaper] = useState<Paper | null>(null);
  const [practice, setPractice] = useState(false);
  const [ac, setAc] = useState<AntiCheat | null>(null);
  const [values, setValues] = useState<Record<number, string>>({});
  const [save, setSave] = useState<SaveState>("saved");
  const [left, setLeft] = useState<number | null>(null);
  const [confirmSubmit, setConfirmSubmit] = useState(false);
  const [warning, setWarning] = useState("");
  const [error, setError] = useState("");
  const pending = useRef<Record<number, string>>({});
  const offset = useRef(0); // server clock - device clock
  const finishing = useRef(false);

  const finish = useCallback(() => nav(`/result/${id}`, { replace: true }), [id, nav]);
  const fail = useCallback(async (e: unknown) => {
    const msg = e instanceof Error ? e.message : String(e);
    if (msg.includes("SESSION_REPLACED")) { alert(friendly(e)); await supabase.auth.signOut(); nav("/login", { replace: true }); }
    return msg;
  }, [nav]);

  // Send unsent answers. Returns false if offline.
  const flush = useCallback(async () => {
    const batch = { ...pending.current };
    const list = Object.entries(batch).map(([p, v]) => ({ position: Number(p), answer: toAnswer(v) }));
    if (!list.length) { setSave("saved"); return true; }
    setSave("saving");
    const { data, error } = await supabase.rpc("save_answers", { p_attempt: id, p_answers: list });
    if (error) { await fail(error); setSave("offline"); return false; }
    for (const [p, v] of Object.entries(batch)) if (pending.current[+p] === v) delete pending.current[+p];
    localStorage.setItem(storeKey, JSON.stringify(pending.current));
    setSave(Object.keys(pending.current).length ? "saving" : "saved");
    if (data === -1) finish(); // time was over on the server
    return true;
  }, [id, storeKey, fail, finish]);

  const submit = useCallback(async () => {
    if (finishing.current) return;
    finishing.current = true;
    setConfirmSubmit(false);
    await flush();
    const { error } = await supabase.rpc("submit_attempt", { p_attempt: id });
    if (error) { finishing.current = false; setError(friendly(await fail(error))); return; }
    localStorage.removeItem(storeKey);
    if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
    finish();
  }, [id, storeKey, flush, fail, finish]);

  // Load paper (+ any answers this device hadn't sent yet)
  useEffect(() => {
    (async () => {
      const [{ data, error }, s, a] = await Promise.all([
        supabase.rpc("get_paper", { p_attempt: id }),
        supabase.from("settings").select("*").single(),
        supabase.from("attempts").select("exams(mode)").eq("id", id).single(),
      ]);
      if (error) return setError(friendly(await fail(error)));
      const p = data as Paper;
      if (p.status !== "in_progress") return finish();
      offset.current = Date.parse(p.server_now) - Date.now();
      const local: Record<number, string> = JSON.parse(localStorage.getItem(storeKey) ?? "{}");
      pending.current = local;
      setValues({ ...Object.fromEntries(p.questions.map((q) => [q.position, q.answer == null ? "" : String(q.answer)])), ...local });
      setAc(s.data);
      setPractice((a.data?.exams as unknown as { mode: string })?.mode === "practice");
      setPaper(p);
    })();
  }, [id, storeKey, fail, finish]);

  // Timer (server time) + autosave every 2 s
  useEffect(() => {
    if (!paper) return;
    const deadline = Date.parse(paper.deadline_at);
    const t = setInterval(() => {
      const ms = deadline - (Date.now() + offset.current);
      setLeft(ms);
      if (ms <= 0) submit();
    }, 250);
    const s = setInterval(() => { if (Object.keys(pending.current).length) flush(); }, 2000);
    const online = () => flush();
    window.addEventListener("online", online);
    return () => { clearInterval(t); clearInterval(s); window.removeEventListener("online", online); };
  }, [paper, flush, submit]);

  // Anti-cheat (switches in Admin → Settings). Deterrence + logging only.
  useEffect(() => {
    if (!paper || !ac) return;
    const log = async (kind: string) => {
      const { data } = await supabase.rpc("log_event", { p_attempt: id, p_kind: kind });
      if (data === "auto_submitted") { localStorage.removeItem(storeKey); finish(); }
    };
    const onHide = () => {
      if (document.visibilityState !== "hidden" || finishing.current) return;
      log("left_screen");
      setWarning("You left the exam screen. This is recorded.");
    };
    const onFs = () => { if (!document.fullscreenElement && !finishing.current) { log("fullscreen_exit"); setWarning("You left full screen. This is recorded."); } };
    const block = (e: Event) => e.preventDefault();
    if (ac.ac_log_leaves) document.addEventListener("visibilitychange", onHide);
    if (ac.ac_fullscreen) document.addEventListener("fullscreenchange", onFs);
    if (ac.ac_block_copy) for (const ev of ["copy", "cut", "paste", "contextmenu"]) document.addEventListener(ev, block);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("fullscreenchange", onFs);
      for (const ev of ["copy", "cut", "paste", "contextmenu"]) document.removeEventListener(ev, block);
    };
  }, [paper, ac, id, storeKey, finish]);

  if (!paper) return <main className="mx-auto max-w-md p-6"><ErrorBox>{error}</ErrorBox>{!error && <p>Loading your paper…</p>}</main>;

  const total = paper.questions.length;
  const answered = paper.questions.filter((q) => toAnswer(values[q.position] ?? "") !== null).length;
  const change = (pos: number, raw: string) => {
    const v = raw.replace(/[^\d.]/g, "").replace(/(\..*)\./g, "$1").slice(0, 15); // digits + one dot
    setValues((x) => ({ ...x, [pos]: v }));
    pending.current[pos] = v;
    localStorage.setItem(storeKey, JSON.stringify(pending.current));
    setSave("saving");
  };
  const next = (i: number) => (document.getElementById(`ans-${i + 1}`) as HTMLInputElement | null)?.focus() ?? setConfirmSubmit(true);

  return (
    <div className={ac?.ac_block_copy ? "select-none" : ""}>
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        {practice && <p className="bg-brass-400 py-1 text-center text-xs font-bold tracking-widest text-slate-900">PRACTICE</p>}
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-4 py-2">
          <b className={`flex items-center gap-2 rounded-md px-3 py-1.5 font-mono text-2xl ${left !== null && left < 60000 ? "bg-red-100 text-red-700" : "bg-indigo-50 text-indigo-700"}`} aria-live="off" aria-label="Time left"><Icon name="clock" className="h-5 w-5" />{left === null ? "--:--" : mmss(left)}</b>
          <span className="hidden text-slate-600 sm:inline">{answered} / {total} done</span>
          <span className="h-2 w-24 overflow-hidden rounded-full bg-slate-200" aria-hidden="true"><span className="block h-full rounded-full bg-indigo-600 transition-all" style={{ width: `${(100 * answered) / total}%` }} /></span>
          <span className={`ml-auto flex items-center gap-1.5 text-sm ${save === "offline" ? "text-red-600" : save === "saving" ? "text-slate-500" : "text-emerald-700"}`} role="status">
            <Icon name={save === "offline" ? "alert" : save === "saving" ? "clock" : "check"} className="h-4 w-4" />
            {save === "saved" ? "Saved" : save === "saving" ? "Saving…" : "Offline, answers kept"}
          </span>
          <Button onClick={() => setConfirmSubmit(true)}>Submit</Button>
        </div>
        {warning && <p className="flex flex-wrap items-center justify-center gap-2 bg-red-50 px-4 py-2 text-center text-sm text-red-800" role="alert"><Icon name="alert" className="h-4 w-4" />{warning}
          {ac?.ac_fullscreen && !document.fullscreenElement && <button className="ml-2 underline" onClick={() => document.documentElement.requestFullscreen?.().catch(() => {})}>Go back to full screen</button>}
          <button className="ml-2 underline" onClick={() => setWarning("")}>OK</button></p>}
      </header>

      <main className="mx-auto grid max-w-3xl gap-3 px-4 py-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        {paper.questions.map((q, i) => (
          <Card key={q.position} className="flex flex-col">
            <span className="mb-2 text-sm text-slate-500">Q{q.position}</span>
            <div className="mb-3 self-end text-right"><QuestionView prompt={q.prompt} /></div>
            <input id={`ans-${i}`} aria-label={`Answer for question ${q.position}`} inputMode="decimal" autoComplete="off"
              className="mt-auto w-full rounded-lg border-2 border-indigo-600 px-3 py-3 text-xl" placeholder="Answer"
              value={values[q.position] ?? ""} onChange={(e) => change(q.position, e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); next(i); } }} onBlur={() => flush()} />
          </Card>
        ))}
        <div className="sm:col-span-2"><Button className="w-full" onClick={() => setConfirmSubmit(true)}>Submit</Button></div>
      </main>

      {confirmSubmit && (
        <div role="dialog" aria-modal="true" className="fixed inset-0 z-20 flex items-center justify-center bg-black/50 p-4">
          <Card className="w-full max-w-sm text-center">
            <h2 className="mb-2 text-2xl font-bold">Submit now?</h2>
            <p className="mb-4">{total - answered ? <>You left <b>{total - answered}</b> question{total - answered > 1 ? "s" : ""} empty.</> : "All questions answered."}</p>
            <Button className="w-full" onClick={submit}>Submit</Button>
            <Button variant="secondary" className="mt-2 w-full" onClick={() => setConfirmSubmit(false)}>Go back</Button>
          </Card>
        </div>
      )}
    </div>
  );
}
