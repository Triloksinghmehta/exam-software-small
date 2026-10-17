import { useEffect, useState } from "react";
import { Button, Card, ErrorBox, Page } from "../../components/ui";
import { RulesEditor, rulesError } from "../../components/RulesEditor";
import { friendly, supabase } from "../../lib/supabase";
import type { Rule } from "../../../../supabase/functions/_shared/generator";

type Level = { level: number; name: string; description: string; default_rules: Rule[]; duration_minutes: number };

// Default rules are copied into each new exam; editing them never changes existing exams.
export default function Levels() {
  const [levels, setLevels] = useState<Level[]>([]);
  const [open, setOpen] = useState<number | null>(null);
  const [rules, setRules] = useState<Rule[]>([]);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState("");

  useEffect(() => {
    supabase.from("levels").select("*").order("level").then(({ data, error }) => (error ? setError(friendly(error)) : setLevels(data)));
  }, []);

  async function save() {
    setError(""); setMsg("");
    const e = rulesError(rules);
    if (e) return setError(e);
    const { error } = await supabase.from("levels").update({ default_rules: rules }).eq("level", open!);
    if (error) return setError(friendly(error));
    setLevels(levels.map((l) => (l.level === open ? { ...l, default_rules: rules } : l)));
    setMsg("Saved. New exams for this level will start with these rules.");
  }

  return (
    <Page title="Levels & default rules" wide>
      <ErrorBox>{error}</ErrorBox>
      {levels.map((l) => (
        <Card key={l.level} className="mb-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div><b className="text-lg">{l.name}</b> <span className="text-slate-600">· {l.description} · {l.default_rules.reduce((s, r) => s + r.quantity, 0)} questions · {l.duration_minutes} min</span></div>
            <Button variant="secondary" onClick={() => { setOpen(open === l.level ? null : l.level); setRules(l.default_rules); setMsg(""); setError(""); }}>
              {open === l.level ? "Close" : "Edit"}
            </Button>
          </div>
          {open === l.level && (
            <div className="mt-4">
              <RulesEditor rules={rules} onChange={setRules} />
              <div className="mt-3 flex items-center gap-3"><Button onClick={save}>Save rules</Button>{msg && <span className="text-green-700">{msg}</span>}</div>
            </div>
          )}
        </Card>
      ))}
    </Page>
  );
}
