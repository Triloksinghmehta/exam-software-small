// Checks every generated question with an independent evaluator (exact decimal math via BigInt),
// plus each rule's constraints. 2,000 questions per rule here; G4 doc records the 10,000 run.
import { describe, expect, it } from "vitest";
import {
  generatePaper, generateQuestion, isDirectAdd, isDirectSub, validateRule, RuleError, type Question, type Rule,
} from "../../supabase/functions/_shared/generator";
import levels from "./levels.fixture.json";

const N = Number(process.env.GEN_SAMPLES ?? 2000);

// "12.30" -> {v: 1230n, s: 2}
const dec = (x: string) => { const [a, b = ""] = x.split("."); return { v: BigInt(a + b), s: b.length }; };
const scaleTo = (d: { v: bigint; s: number }, s: number) => d.v * 10n ** BigInt(s - d.s);
const eqDec = (a: string, b: string) => { const x = dec(a), y = dec(b), s = Math.max(x.s, y.s); return scaleTo(x, s) === scaleTo(y, s); };

function evaluate(q: Question): string {
  const p = q.prompt;
  if (p.layout === "sequence") {
    const i = p.rows.indexOf("?");
    const n = Number(p.rows[i === 0 ? 1 : 0]) / (i === 0 ? 2 : 1);
    return String(n * (i + 1));
  }
  if (p.layout === "inline") {
    // BODMAS, integers only, every ÷ exact
    const t = p.rows[0].split(" ");
    const terms: number[] = []; let sign = 1, g = Number(t[0]);
    for (let i = 1; i < t.length; i += 2) {
      const op = t[i], n = Number(t[i + 1]);
      if (op === "×") g *= n;
      else if (op === "÷") { expect(g % n).toBe(0); g /= n; }
      else { terms.push(sign * g); sign = op === "+" ? 1 : -1; g = n; }
    }
    terms.push(sign * g);
    let total = 0;
    for (const x of terms) { total += x; expect(total).toBeGreaterThanOrEqual(0); }
    return String(total);
  }
  // vertical
  let acc = dec(p.rows[0]);
  for (const row of p.rows.slice(1)) {
    const [op, num] = row.split(" ");
    const n = dec(num);
    if (op === "+" || op === "−") {
      const s = Math.max(acc.s, n.s);
      acc = { v: op === "+" ? scaleTo(acc, s) + scaleTo(n, s) : scaleTo(acc, s) - scaleTo(n, s), s };
      expect(acc.v >= 0n).toBe(true); // never negative midway
    } else if (op === "×") acc = { v: acc.v * n.v, s: acc.s + n.s };
    else if (op === "÷") {
      // exact division: scale dividend up until divisible
      const v = acc.v * 10n ** BigInt(n.s), s = acc.s;
      expect(v % n.v).toBe(0n);
      acc = { v: v / n.v, s };
    } else throw new Error("bad op " + op);
  }
  const str = acc.v.toString().padStart(acc.s + 1, "0");
  return acc.s ? str.slice(0, -acc.s) + "." + str.slice(-acc.s) : str;
}

const wholeDigits = (s: string) => s.split(".")[0].length;
function checkRule(r: Rule, n = N) {
  for (let i = 0; i < n; i++) {
    const q = generateQuestion(r, Math.random);
    expect(eqDec(evaluate(q), q.answer), JSON.stringify(q)).toBe(true);
    expect(q.answer.startsWith("-")).toBe(false);
    const rows = q.prompt.rows;
    if (q.prompt.layout === "vertical") {
      expect(rows).toHaveLength(r.rows);
      const nums = rows.map((x, j) => (j ? x.split(" ")[1] : x));
      if (r.operation !== "division" && r.operation !== "decimal_division") {
        expect(wholeDigits(nums[0])).toBe(r.digits[0]);
        nums.slice(1).forEach((x) => expect(wholeDigits(x)).toBe(r.digits[1]));
      } else expect(wholeDigits(nums[0])).toBe(r.digits[0]);
      if (r.decimals) {
        expect(nums[0].split(".")[1]).toHaveLength(r.decimals[0]);
        nums.slice(1).forEach((x) => expect(x.split(".")[1]).toHaveLength(r.decimals![1]));
      }
      if (r.formula) {
        let total = Number(nums[0]);
        rows.slice(1).forEach((row) => {
          const [op, x] = row.split(" "); const v = Number(x);
          const direct = op === "+" ? isDirectAdd(total, v) : isDirectSub(total, v);
          expect(direct, `${r.formula} ${total}${op}${v}`).toBe(r.formula === "direct");
          total = op === "+" ? total + v : total - v;
        });
      }
    }
  }
}

describe("abacus rod rules", () => {
  it("direct addition / subtraction", () => {
    expect(isDirectAdd(1, 3)).toBe(true);   // 1+3 = 4, lower beads only
    expect(isDirectAdd(3, 4)).toBe(false);  // needs 5 (small friend)
    expect(isDirectAdd(6, 5)).toBe(false);  // needs 10 (big friend)
    expect(isDirectAdd(5, 3)).toBe(true);
    expect(isDirectSub(8, 3)).toBe(true);
    expect(isDirectSub(5, 2)).toBe(false);  // small friend
    expect(isDirectSub(12, 5)).toBe(false); // big friend
  });
});

describe("every operation", () => {
  const rules: Rule[] = [
    { operation: "addition", digits: [2, 1], rows: 5, quantity: 1 },
    { operation: "add_sub", digits: [3, 3], rows: 8, quantity: 1 },
    { operation: "add_sub", digits: [1, 1], rows: 3, quantity: 1, formula: "direct" },
    { operation: "add_sub", digits: [1, 1], rows: 4, quantity: 1, formula: "friends" },
    { operation: "multiplication", digits: [3, 4], rows: 2, quantity: 1 },
    { operation: "multiplication", digits: [1, 1], rows: 3, quantity: 1 },
    { operation: "division", digits: [4, 2], rows: 2, quantity: 1 },
    { operation: "division", digits: [4, 1], rows: 3, quantity: 1 },
    { operation: "decimal_addition", digits: [2, 1], rows: 4, quantity: 1, decimals: [2, 1] },
    { operation: "decimal_add_sub", digits: [2, 2], rows: 5, quantity: 1, decimals: [2, 2] },
    { operation: "decimal_multiplication", digits: [2, 1], rows: 2, quantity: 1, decimals: [1, 2] },
    { operation: "decimal_division", digits: [3, 1], rows: 2, quantity: 1, decimals: [2, 1] },
    { operation: "table", digits: [0, 0], rows: 6, quantity: 1, range: [2, 5000] },
    { operation: "mixed", digits: [2, 1], rows: 5, quantity: 1 },
    { operation: "mixed", digits: [2, 2], rows: 8, quantity: 1 },
  ];
  for (const r of rules) it(`${r.operation} ${JSON.stringify(r.digits)}x${r.rows}${r.formula ? " " + r.formula : ""}`, () => checkRule(r));

  it("mixed with 5+ rows uses all four operations", () => {
    for (let i = 0; i < 200; i++) {
      const t = generateQuestion({ operation: "mixed", digits: [2, 1], rows: 5, quantity: 1 }, Math.random).prompt.rows[0];
      for (const op of ["+", "−", "×", "÷"]) expect(t).toContain(` ${op} `);
    }
  });
});

describe("default level rules (levels 0–8 from the database)", () => {
  for (const l of levels) {
    it(`level ${l.level} makes a full paper`, () => {
      for (const r of l.default_rules as Rule[]) checkRule(r, Math.ceil(N / 4));
      const paper = generatePaper(l.default_rules as Rule[]);
      expect(paper).toHaveLength((l.default_rules as Rule[]).reduce((s, r) => s + r.quantity, 0));
    });
  }
});

describe("bad rules are rejected, never faked", () => {
  it("validation messages", () => {
    expect(validateRule({ operation: "add_sub", digits: [1, 1], rows: 1, quantity: 5 })).toMatch(/Rows/);
    expect(validateRule({ operation: "table", digits: [0, 0], rows: 5, quantity: 5 })).toMatch(/range/);
    expect(validateRule({ operation: "decimal_add_sub", digits: [1, 1], rows: 3, quantity: 5 })).toMatch(/Decimal/);
    expect(validateRule({ operation: "add_sub", digits: [2, 2], rows: 3, quantity: 5, formula: "direct" })).toMatch(/1-digit/);
  });
  it("impossible rule throws instead of breaking the rule", () => {
    // 1-digit dividend ÷ three divisors (each ≥2) with quotient ≥2 is impossible (needs ≥16)
    expect(() => generateQuestion({ operation: "division", digits: [1, 1], rows: 4, quantity: 1 }, Math.random)).toThrow(RuleError);
  });
  it("paper error names the rule", () => {
    expect(() => generatePaper([{ operation: "addition", digits: [1, 1], rows: 2, quantity: 1 }, { operation: "division", digits: [1, 1], rows: 4, quantity: 1 }]))
      .toThrow(/Rule 2/);
  });
});
