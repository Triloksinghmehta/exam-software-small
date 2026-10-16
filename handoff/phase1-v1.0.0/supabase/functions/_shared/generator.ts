// Abacus question generator v1 (docs/question-rules.md).
// Shared by the start-attempt Edge Function (real papers) and the admin preview.
// All math is on integers (decimals are scaled), so answers are exact. Answers are returned as strings.

export const GENERATOR_VERSION = "v1";

export const OPERATIONS = {
  addition: "Addition (+)",
  multiplication: "Multiplication (×)",
  division: "Division (÷)",
  add_sub: "Addition & Subtraction (+/−)",
  decimal_addition: "Decimal Addition (+)",
  decimal_multiplication: "Decimal Multiplication (×)",
  decimal_division: "Decimal Division (÷)",
  decimal_add_sub: "Decimal Addition & Subtraction (+/−)",
  table: "Table",
  mixed: "Mixed (+ − × ÷, BODMAS)",
} as const;
export type Operation = keyof typeof OPERATIONS;

export type Rule = {
  operation: Operation;
  digits: [number, number];      // whole-number digits: [first row, other rows]
  rows: number;                  // numbers per question (table: sequence length)
  quantity: number;
  decimals?: [number, number];   // decimal_* only
  range?: [number, number];      // table only
  formula?: "direct" | "friends"; // addition / add_sub only
};

// Operators shown to students: + − × ÷ (Unicode minus).
// layout: "vertical" = stacked rows (first row has no operator), "sequence" = table with "?", "inline" = one line (mixed)
export type Prompt = { layout: "vertical" | "sequence" | "inline"; rows: string[] };
export type Question = { kind: Operation; prompt: Prompt; answer: string };
export type Rng = () => number; // [0, 1)

export class RuleError extends Error {}

// Server default: crypto randomness (Math.random is predictable)
export const cryptoRng: Rng = () => crypto.getRandomValues(new Uint32Array(1))[0] / 2 ** 32;

const int = (rng: Rng, lo: number, hi: number) => lo + Math.floor(rng() * (hi - lo + 1));
const pick = <T>(rng: Rng, xs: T[]) => xs[Math.floor(rng() * xs.length)];
const nDigits = (rng: Rng, d: number) => int(rng, 10 ** (d - 1), 10 ** d - 1);
const digitCount = (n: number) => String(Math.trunc(Math.abs(n))).length;

// Scaled integer -> decimal string with exactly `dec` places ("030" dec 2 -> "0.30")
function fmt(v: number, dec: number): string {
  if (dec === 0) return String(v);
  const s = String(Math.abs(v)).padStart(dec + 1, "0");
  return (v < 0 ? "-" : "") + s.slice(0, -dec) + "." + s.slice(-dec);
}
// Answer form: no trailing zeros ("12.50" -> "12.5", "3.00" -> "3")
const clean = (s: string) => (s.includes(".") ? s.replace(/\.?0+$/, "") : s);

// --- Abacus rules (per rod/digit), from the reference app ---
// Direct = no carry and no 5-bead formula on any rod
function digitsOf(a: number, b: number): [number[], number[]] {
  const len = Math.max(digitCount(a), digitCount(b));
  const p = (n: number) => String(n).padStart(len, "0").split("").map(Number);
  return [p(a), p(b)];
}
export function isDirectAdd(a: number, b: number) {
  const [x, y] = digitsOf(a, b);
  return x.every((d, i) => d + y[i] <= 9 && (d % 5) + (y[i] % 5) < 5);
}
export function isDirectSub(a: number, b: number) {
  const [x, y] = digitsOf(a, b);
  return x.every((d, i) => d >= y[i] && d % 5 >= y[i] % 5);
}

const MAX_TRIES = 2000;

export function validateRule(r: Rule): string | null {
  if (!(r.operation in OPERATIONS)) return "Unknown operation";
  const isDec = r.operation.startsWith("decimal_");
  const ok = (n: unknown, lo: number, hi: number) => Number.isInteger(n) && (n as number) >= lo && (n as number) <= hi;
  if (!ok(r.quantity, 1, 100)) return "How many must be 1 to 100";
  if (r.operation === "table") {
    if (!ok(r.rows, 3, 20)) return "Table length must be 3 to 20";
    if (!r.range || !ok(r.range[0], 2, 10000) || !ok(r.range[1], r.range[0], 10000)) return "Table range must be like 2 to 100";
    return null;
  }
  if (!r.digits || !ok(r.digits[0], 1, 6) || !ok(r.digits[1], 1, 6)) return "Digits must be 1 to 6";
  const minRows = r.operation === "mixed" ? 3 : 2;
  if (!ok(r.rows, minRows, 30)) return `Rows must be ${minRows} to 30`;
  if (isDec && (!r.decimals || !ok(r.decimals[0], 1, 3) || !ok(r.decimals[1], 1, 3))) return "Decimal places must be 1 to 3";
  if (r.operation === "decimal_division" && r.rows !== 2) return "Decimal division supports 2 rows only";
  if (r.operation === "decimal_division" && r.decimals![1] > r.decimals![0]) return "Decimal division: divisor can't have more decimal places than the dividend";
  if ((r.operation === "multiplication" || r.operation === "decimal_multiplication") && r.rows > 4) return "Multiplication supports up to 4 rows";
  if (r.formula && r.operation !== "addition" && r.operation !== "add_sub") return "Formula applies to addition only";
  if (r.formula === "direct" && (r.digits[0] > 1 || r.digits[1] > 1)) return "Direct formula is for 1-digit questions";
  return null;
}

// --- one question per operation; return null to retry ---
function addSub(rng: Rng, r: Rule, ops: ("+" | "-")[]): Question | null {
  let total = nDigits(rng, r.digits[0]);
  const rows = [String(total)];
  for (let i = 1; i < r.rows; i++) {
    const n = nDigits(rng, r.digits[1]);
    const op = pick(rng, ops);
    const next = op === "+" ? total + n : total - n;
    if (next < 0) return null;
    if (r.formula === "direct" && !(op === "+" ? isDirectAdd(total, n) : isDirectSub(total, n))) return null;
    if (r.formula === "friends" && (op === "+" ? isDirectAdd(total, n) : isDirectSub(total, n))) return null; // every step must use a friend
    rows.push(`${op === "-" ? "−" : "+"} ${n}`);
    total = next;
  }
  return { kind: r.operation, prompt: { layout: "vertical", rows }, answer: String(total) };
}

function decAddSub(rng: Rng, r: Rule, ops: ("+" | "-")[]): Question | null {
  const [p1, p2] = r.decimals!;
  const dec = Math.max(p1, p2);
  let total = nDigits(rng, r.digits[0] + p1) * 10 ** (dec - p1);
  const rows = [fmt(total / 10 ** (dec - p1), p1)];
  for (let i = 1; i < r.rows; i++) {
    const raw = nDigits(rng, r.digits[1] + p2);
    const op = pick(rng, ops);
    const next = op === "+" ? total + raw * 10 ** (dec - p2) : total - raw * 10 ** (dec - p2);
    if (next < 0) return null;
    rows.push(`${op === "-" ? "−" : "+"} ${fmt(raw, p2)}`);
    total = next;
  }
  return { kind: r.operation, prompt: { layout: "vertical", rows }, answer: clean(fmt(total, dec)) };
}

function multiply(rng: Rng, r: Rule, decimals?: [number, number]): Question | null {
  const [p1, p2] = decimals ?? [0, 0];
  let v = nDigits(rng, r.digits[0] + p1);
  let dec = p1;
  const rows = [fmt(v, p1)];
  for (let i = 1; i < r.rows; i++) {
    const n = nDigits(rng, r.digits[1] + p2);
    v *= n; dec += p2;
    rows.push(`× ${fmt(n, p2)}`);
  }
  if (!Number.isSafeInteger(v)) return null;
  return { kind: r.operation, prompt: { layout: "vertical", rows }, answer: clean(fmt(v, dec)) };
}

function divide(rng: Rng, r: Rule): Question | null {
  // Build backwards so it is always exact: dividend = quotient × divisors
  const [d1, d2] = r.digits;
  const divisors: number[] = [];
  for (let i = 1; i < r.rows; i++) divisors.push(d2 === 1 ? int(rng, 2, 9) : nDigits(rng, d2));
  const p = divisors.reduce((a, b) => a * b, 1);
  const lo = Math.ceil(10 ** (d1 - 1) / p), hi = Math.floor((10 ** d1 - 1) / p);
  if (lo > hi || hi < 2) return null;
  const q = int(rng, Math.max(lo, 2), hi);
  return { kind: "division", prompt: { layout: "vertical", rows: [String(q * p), ...divisors.map((d) => `÷ ${d}`)] }, answer: String(q) };
}

function decDivide(rng: Rng, r: Rule): Question | null {
  // dividend (d1 whole digits, p1 places) ÷ divisor (d2, p2) = quotient with p1 - p2 places, exact
  const [d1, d2] = r.digits, [p1, p2] = r.decimals!;
  const D = nDigits(rng, d2 + p2);
  const lo = Math.ceil(10 ** (d1 + p1 - 1) / D), hi = Math.floor((10 ** (d1 + p1) - 1) / D);
  if (lo > hi) return null;
  const Q = int(rng, lo, hi);
  if (Q % 10 === 0) return null; // avoid answers that look shorter than asked
  return { kind: "decimal_division", prompt: { layout: "vertical", rows: [fmt(Q * D, p1), `÷ ${fmt(D, p2)}`] }, answer: clean(fmt(Q, p1 - p2)) };
}

function table(rng: Rng, r: Rule): Question {
  const n = int(rng, r.range![0], r.range![1]);
  const miss = int(rng, 1, r.rows - 2); // never first or last
  const seq = Array.from({ length: r.rows }, (_, i) => String(n * (i + 1)));
  const answer = seq[miss];
  seq[miss] = "?";
  return { kind: "table", prompt: { layout: "sequence", rows: seq }, answer };
}

// BODMAS: × and ÷ first, then + and − left to right. Every intermediate value is a whole number ≥ 0.
function mixed(rng: Rng, r: Rule): Question | null {
  const ops: string[] = [];
  const all = ["+", "-", "×", "÷"];
  if (r.rows - 1 >= 4) ops.push(...all);
  while (ops.length < r.rows - 1) ops.push(pick(rng, all));
  for (let i = ops.length - 1; i > 0; i--) { const j = int(rng, 0, i); [ops[i], ops[j]] = [ops[j], ops[i]]; }

  const tokens = [String(nDigits(rng, r.digits[0]))];
  let total = 0, sign = 1, group = Number(tokens[0]);
  for (const op of ops) {
    if (op === "×") {
      const n = int(rng, 2, 9);
      group *= n; tokens.push("×", String(n));
    } else if (op === "÷") {
      const ds = [];
      for (let d = 2; d <= 12; d++) if (group % d === 0) ds.push(d);
      if (!ds.length) return null;
      const d = pick(rng, ds);
      group /= d; tokens.push("÷", String(d));
    } else {
      total += sign * group;
      if (total < 0) return null;
      sign = op === "+" ? 1 : -1;
      group = nDigits(rng, r.digits[1]);
      tokens.push(op === "-" ? "−" : "+", String(group));
    }
  }
  total += sign * group;
  if (total < 0 || !Number.isSafeInteger(total)) return null;
  return { kind: "mixed", prompt: { layout: "inline", rows: [tokens.join(" ")] }, answer: String(total) };
}

export function generateQuestion(r: Rule, rng: Rng = cryptoRng): Question {
  const err = validateRule(r);
  if (err) throw new RuleError(err);
  for (let t = 0; t < MAX_TRIES; t++) {
    let q: Question | null;
    switch (r.operation) {
      case "addition": q = addSub(rng, r, ["+"]); break;
      case "add_sub": q = addSub(rng, r, ["+", "-"]); break;
      case "decimal_addition": q = decAddSub(rng, r, ["+"]); break;
      case "decimal_add_sub": q = decAddSub(rng, r, ["+", "-"]); break;
      case "multiplication": q = multiply(rng, r); break;
      case "decimal_multiplication": q = multiply(rng, r, r.decimals); break;
      case "division": q = divide(rng, r); break;
      case "decimal_division": q = decDivide(rng, r); break;
      case "table": q = table(rng, r); break;
      case "mixed": q = mixed(rng, r); break;
    }
    if (q) return q;
  }
  // No silent fallback (reference problem R6): the admin must fix the rule
  throw new RuleError("These settings can't make valid questions. Try fewer rows or different digits.");
}

export function generatePaper(rules: Rule[], rng: Rng = cryptoRng): Question[] {
  if (!Array.isArray(rules) || !rules.length) throw new RuleError("Add at least one rule");
  const total = rules.reduce((s, r) => s + (r.quantity || 0), 0);
  if (total > 200) throw new RuleError("Too many questions (max 200)");
  return rules.flatMap((r, i) => {
    try {
      return Array.from({ length: r.quantity }, () => generateQuestion(r, rng));
    } catch (e) {
      throw new RuleError(`Rule ${i + 1} (${OPERATIONS[r.operation] ?? r.operation}): ${(e as Error).message}`);
    }
  });
}
