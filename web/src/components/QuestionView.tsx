import type { Prompt } from "../../../supabase/functions/_shared/generator";

// One question, abacus style. Used by admin preview now and the exam screen in G5.
export function QuestionView({ prompt }: { prompt: Prompt }) {
  if (prompt.layout === "sequence")
    return <p className="font-mono text-2xl font-bold tabular-nums text-slate-900"><span className="mb-1 block font-sans text-xs font-semibold text-slate-500">Fill the missing number</span>{prompt.rows.join(", ")}</p>;
  if (prompt.layout === "inline") return <p className="font-mono text-2xl font-bold tabular-nums text-slate-900">{prompt.rows[0]} = ?</p>;
  return (
    <div className="inline-grid grid-cols-[auto_auto] gap-x-3 font-mono text-2xl font-bold leading-tight tabular-nums text-slate-900">
      {prompt.rows.map((r, i) => {
        const [op, num] = i === 0 ? ["", r] : r.split(" ");
        return [<span key={`o${i}`} className="text-indigo-600">{op}</span>, <span key={`n${i}`} className="text-right">{num}</span>];
      })}
      <span className="col-span-2 mt-1.5 border-t-[3px] border-slate-900" />
    </div>
  );
}
