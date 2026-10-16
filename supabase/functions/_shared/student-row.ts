// Shared by the browser (CSV preview) and the admin-students Edge Function (final check).
export type StudentInput = { full_name: string; father_name: string; dob: string; level: number };
export type RowCheck = { ok: true; value: StudentInput } | { ok: false; errors: string[] };

export const CSV_HEADERS = ["full_name", "father_name", "dob", "level"] as const;

// DD-MM-YYYY (as typed in India) -> YYYY-MM-DD; null if not a real date
export function parseDob(s: string): string | null {
  const m = /^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/.exec(s.trim());
  if (!m) return null;
  const [d, mo, y] = [+m[1], +m[2], +m[3]];
  const dt = new Date(Date.UTC(y, mo - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== mo - 1 || dt.getUTCDate() !== d) return null;
  if (y < 1990 || dt > new Date()) return null;
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const clean = (v: unknown) => String(v ?? "").trim().replace(/\s+/g, " ");

export function checkRow(raw: Record<string, unknown>): RowCheck {
  const errors: string[] = [];
  const full_name = clean(raw.full_name);
  const father_name = clean(raw.father_name);
  if (!full_name) errors.push("Name missing");
  else if (full_name.length > 100) errors.push("Name too long");
  if (!father_name) errors.push("Father's name missing");
  else if (father_name.length > 100) errors.push("Father's name too long");
  const dob = parseDob(clean(raw.dob));
  if (!dob) errors.push("Bad date of birth (use DD-MM-YYYY)");
  const lv = clean(raw.level).replace(/^level\s*/i, "");
  const level = /^\d$/.test(lv) ? Number(lv) : NaN;
  if (!(level >= 0 && level <= 8)) errors.push("Level must be 0 to 8");
  return errors.length ? { ok: false, errors } : { ok: true, value: { full_name, father_name, dob: dob!, level } };
}

// Same duplicate rule as the database index: name + father's name + DOB, ignoring case and spaces
export const identityKey = (s: { full_name: string; father_name: string; dob: string }) =>
  `${s.full_name.toLowerCase()}|${s.father_name.toLowerCase()}|${s.dob}`;
