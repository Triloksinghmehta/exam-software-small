// Shared by the browser (CSV preview) and the admin-students Edge Function (final check).
export type StudentInput = { full_name: string; father_name: string; dob: string; level: number; student_id?: string; password?: string };
export type RowCheck = { ok: true; value: StudentInput } | { ok: false; errors: string[] };

export const CSV_HEADERS = ["full_name", "father_name", "dob", "level"] as const;
export const CUSTOM_HEADERS = ["student_id", "password"] as const; // extra columns when Settings > import_mode = custom

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

// custom: also check the optional student_id / password columns (blank = generate). prefix: the automatic ID start, which custom IDs may not use.
export function checkRow(raw: Record<string, unknown>, custom?: { prefix: string }): RowCheck {
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
  const value: StudentInput = { full_name, father_name, dob: dob!, level };
  if (custom) {
    const id = clean(raw.student_id).toUpperCase();
    const pw = String(raw.password ?? "");
    if (id) {
      if (!/^[A-Z0-9]{4,20}$/.test(id)) errors.push("ID must be 4 to 20 letters or digits");
      else if (id.startsWith(custom.prefix)) errors.push(`ID cannot start with ${custom.prefix} (used for automatic IDs)`);
      else value.student_id = id;
    }
    if (pw) {
      if (pw.length < 6 || pw.length > 72) errors.push("Password must be 6 to 72 characters");
      else value.password = pw;
    }
  }
  return errors.length ? { ok: false, errors } : { ok: true, value };
}

// Same duplicate rule as the database index: name + father's name + DOB, ignoring case and spaces
export const identityKey = (s: { full_name: string; father_name: string; dob: string }) =>
  `${s.full_name.toLowerCase()}|${s.father_name.toLowerCase()}|${s.dob}`;
