import type { Prompt } from "../../../supabase/functions/_shared/generator";

// One question, abacus style. Used by admin preview now and the exam screen in G5.
export function QuestionView({ prompt }: { prompt: Prompt }) {
  if (prompt.layout === "sequence")
    return <p className="font-mono text-xl"><span className="block text-xs font-sans text-slate-500 mb-1">Fill the missing number</span>{prompt.rows.join(", ")}</p>;
  if (prompt.layout === "inline") return <p className="font-mono text-xl">{prompt.rows[0]} = ?</p>;
  return (
    <div className="inline-grid grid-cols-[auto_auto] gap-x-2 font-mono text-xl leading-snug">
      {prompt.rows.map((r, i) => {
        const [op, num] = i === 0 ? ["", r] : r.split(" ");
        return [<span key={`o${i}`} className="text-slate-500">{op}</span>, <span key={`n${i}`} className="text-right">{num}</span>];
      })}
      <span className="col-span-2 mt-1 border-t-2 border-slate-800" />
    </div>
  );
}
