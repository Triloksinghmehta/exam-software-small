import { useState } from "react";
import { OPERATIONS, generatePaper, validateRule, type Operation, type Question, type Rule } from "../../../supabase/functions/_shared/generator";
import { Button, ErrorBox } from "./ui";
import { QuestionView } from "./QuestionView";

const num = "w-16 rounded-lg border border-slate-300 bg-white px-2 py-2";
const blank = (): Rule => ({ operation: "add_sub", digits: [2, 2], rows: 3, quantity: 5 });

// Fill in fields an operation needs, drop ones it doesn't
function normalise(r: Rule): Rule {
  const out: Rule = { operation: r.operation, digits: r.digits ?? [1, 1], rows: r.rows, quantity: r.quantity };
  if (r.operation.startsWith("decimal_")) out.decimals = r.decimals ?? [1, 1];
  if (r.operation === "table") { out.range = r.range ?? [2, 100]; out.rows = Math.max(3, r.rows); }
  if ((r.operation === "addition" || r.operation === "add_sub") && r.formula) out.formula = r.formula;
  if (r.operation === "mixed") out.rows = Math.max(3, r.rows);
  return out;
}

export function rulesError(rules: Rule[]): string | null {
  if (!rules.length) return "Add at least one question rule";
  for (const [i, r] of rules.entries()) { const e = validateRule(r); if (e) return `Rule ${i + 1}: ${e}`; }
  try { generatePaper(rules); } catch (e) { return (e as Error).message; }
  return null;
}

export function RulesEditor({ rules, onChange, locked }: { rules: Rule[]; onChange: (r: Rule[]) => void; locked?: boolean }) {
  const [preview, setPreview] = useState<Question[] | null>(null);
  const [error, setError] = useState("");
  const set = (i: number, patch: Partial<Rule>) => onChange(rules.map((r, j) => (j === i ? normalise({ ...r, ...patch }) : r)));
  const pair = (i: number, key: "digits" | "decimals" | "range", k: 0 | 1, v: string) => {
    const cur = [...(rules[i][key] ?? [1, 1])] as [number, number];
    cur[k] = Number(v);
    set(i, { [key]: cur });
  };
  const total = rules.reduce((s, r) => s + (Number(r.quantity) || 0), 0);

  function doPreview() {
    setError("");
    const e = rulesError(rules);
    if (e) { setPreview(null); return setError(e); }
    setPreview(generatePaper(rules));
  }

  return (
    <div>
      <fieldset disabled={locked} className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead><tr className="text-slate-600">{["Operation", "Digits (1st / rest)", "Decimals", "Rows", "How many", "Other", ""].map((h) => <th key={h} className="p-2 font-medium">{h}</th>)}</tr></thead>
          <tbody>
            {rules.map((r, i) => {
              const isDec = r.operation.startsWith("decimal_"), isTable = r.operation === "table";
              return (
                <tr key={i} className="border-t border-slate-100 align-middle">
                  <td className="p-2">
                    <select aria-label={`Rule ${i + 1} operation`} className="rounded-lg border border-slate-300 bg-white px-2 py-2" value={r.operation}
                      onChange={(e) => set(i, { operation: e.target.value as Operation })}>
                      {Object.entries(OPERATIONS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                    </select>
                  </td>
                  <td className="p-2 whitespace-nowrap">{isTable ? "—" : <>
                    <input aria-label="Digits first row" type="number" min={1} max={6} className={num} value={r.digits[0]} onChange={(e) => pair(i, "digits", 0, e.target.value)} /> /{" "}
                    <input aria-label="Digits other rows" type="number" min={1} max={6} className={num} value={r.digits[1]} onChange={(e) => pair(i, "digits", 1, e.target.value)} /></>}
                  </td>
                  <td className="p-2 whitespace-nowrap">{isDec ? <>
                    <input aria-label="Decimals first row" type="number" min={1} max={3} className={num} value={r.decimals![0]} onChange={(e) => pair(i, "decimals", 0, e.target.value)} /> /{" "}
                    <input aria-label="Decimals other rows" type="number" min={1} max={3} className={num} value={r.decimals![1]} onChange={(e) => pair(i, "decimals", 1, e.target.value)} /></> : "—"}
                  </td>
                  <td className="p-2"><input aria-label="Rows" type="number" min={2} max={30} className={num} value={r.rows} onChange={(e) => set(i, { rows: Number(e.target.value) })} /></td>
                  <td className="p-2"><input aria-label="How many" type="number" min={1} max={100} className={num} value={r.quantity} onChange={(e) => set(i, { quantity: Number(e.target.value) })} /></td>
                  <td className="p-2 whitespace-nowrap">
                    {isTable && <>Tables <input aria-label="Table from" type="number" className={num} value={r.range![0]} onChange={(e) => pair(i, "range", 0, e.target.value)} /> to{" "}
                      <input aria-label="Table to" type="number" className={`${num} w-20`} value={r.range![1]} onChange={(e) => pair(i, "range", 1, e.target.value)} /></>}
                    {(r.operation === "addition" || r.operation === "add_sub") && (
                      <select aria-label="Formula" className="rounded-lg border border-slate-300 bg-white px-2 py-2" value={r.formula ?? ""}
                        onChange={(e) => set(i, { formula: (e.target.value || undefined) as Rule["formula"] })}>
                        <option value="">Any</option><option value="direct">Direct only (Level 0)</option><option value="friends">Friends (Level 1)</option>
                      </select>)}
                  </td>
                  <td className="p-2"><button type="button" className="text-red-700 underline" onClick={() => onChange(rules.filter((_, j) => j !== i))}>Remove</button></td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </fieldset>
      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!locked && <Button type="button" variant="secondary" onClick={() => onChange([...rules, blank()])}>+ Add rule</Button>}
        <b>Total: {total} questions = {total} marks</b>
        <Button type="button" variant="secondary" onClick={doPreview}>Preview sample paper</Button>
      </div>
      <div className="mt-3"><ErrorBox>{error}</ErrorBox></div>
      {preview && (
        <div className="mt-3 rounded-xl border border-slate-200 p-3">
          <div className="mb-2 flex justify-between"><b>Sample paper (each student gets different numbers)</b><button type="button" className="text-blue-700 underline" onClick={() => setPreview(null)}>Hide</button></div>
          <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {preview.map((q, i) => (
              <div key={i} className="rounded-lg bg-slate-50 p-3">
                <p className="text-xs text-slate-500 mb-1">Q{i + 1}</p>
                <QuestionView prompt={q.prompt} />
                <p className="mt-2 text-sm text-green-700">Answer: <b>{q.answer}</b></p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
