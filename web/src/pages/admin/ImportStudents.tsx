import { useEffect, useState } from "react";
import Papa from "papaparse";
import { Link } from "react-router-dom";
import { Button, Card, ErrorBox, Page, download, toCsv } from "../../components/ui";
import { adminStudents, friendly, supabase } from "../../lib/supabase";
import { CSV_HEADERS, CUSTOM_HEADERS, checkRow, identityKey } from "../../../../supabase/functions/_shared/student-row";

type Row = { row: number; raw: Record<string, string>; errors: string[] };
type Created = { row: number; student_code: string; full_name: string; password: string };
const MAX_FILE = 2 * 1024 * 1024; // 2 MB ≈ 40,000 students
const BATCH = 50; // must match MAX_BATCH in the Edge Function

export default function ImportStudents() {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [cfg, setCfg] = useState<{ id_prefix: string; import_mode: string } | null>(null);
  useEffect(() => { supabase.from("settings").select("id_prefix, import_mode").single().then(({ data }) => setCfg(data)); }, []);
  const custom = cfg?.import_mode === "custom" ? { prefix: cfg.id_prefix } : undefined;
  const headers = custom ? [...CSV_HEADERS, ...CUSTOM_HEADERS] : [...CSV_HEADERS];
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const [result, setResult] = useState<{ created: Created[]; failed: Row[] } | null>(null);

  const good = rows?.filter((r) => !r.errors.length) ?? [];
  const bad = rows?.filter((r) => r.errors.length) ?? [];

  async function pick(file?: File) {
    setError(""); setRows(null); setResult(null);
    if (!file || !cfg) return;
    if (file.size > MAX_FILE) return setError("File too big (max 2 MB). Split it into smaller files.");
    const parsed = Papa.parse<Record<string, string>>(await file.text(), {
      header: true, skipEmptyLines: "greedy", transformHeader: (h) => h.trim().toLowerCase().replace(/[\s']+/g, "_"),
    });
    const missing = headers.filter((h) => !parsed.meta.fields?.includes(h));
    if (missing.length) return setError(`Wrong columns. Missing: ${missing.join(", ")}. Please use the template.`);
    if (!parsed.data.length) return setError("The file has no student rows.");

    // Existing students, to flag duplicates before sending anything
    const { data: existing, error: e } = await supabase.from("students").select("full_name, father_name, dob, student_code");
    if (e) return setError(friendly(e));
    const taken = new Set((existing ?? []).map(identityKey));
    const seen = new Set<string>();
    const takenIds = new Set((existing ?? []).map((s) => s.student_code));
    const seenIds = new Set<string>();
    setRows(parsed.data.map((raw, i) => {
      const c = checkRow(raw, custom);
      const errors = c.ok ? [] : c.errors;
      if (c.ok) {
        const k = identityKey(c.value);
        if (taken.has(k)) errors.push("Already exists (same name, father's name, DOB)");
        else if (seen.has(k)) errors.push("Duplicate in file");
        seen.add(k);
        const id = c.value.student_id;
        if (id) {
          if (takenIds.has(id) || seenIds.has(id)) errors.push("ID already taken");
          seenIds.add(id);
        }
      }
      return { row: i + 2, raw, errors }; // +2: header is line 1
    }));
  }

  async function runImport() {
    const created: Created[] = [];
    const failed: Row[] = [];
    setProgress({ done: 0, total: good.length });
    try {
      for (let i = 0; i < good.length; i += BATCH) {
        const chunk = good.slice(i, i + BATCH);
        const r = await adminStudents<{ created: Created[]; failed: { row: number; errors: string[] }[] }>(
          { action: "create", rows: chunk.map((g) => ({ ...g.raw, row: g.row })) });
        created.push(...r.created);
        failed.push(...r.failed.map((f) => ({ row: f.row, errors: f.errors, raw: chunk.find((c) => c.row === f.row)?.raw ?? {} })));
        setProgress({ done: Math.min(i + BATCH, good.length), total: good.length });
      }
    } catch (e) {
      // Students already created stay created; their passwords are still downloadable below
      setError(`Stopped: ${friendly(e)}. ${created.length} students were added before the stop.`);
    }
    setResult({ created, failed });
    setProgress(null);
  }

  const badCsv = (list: Row[]) => toCsv([[...headers, "problem"], ...list.map((r) => [...headers.map((h) => r.raw[h]), r.errors.join("; ")])]);

  if (result) {
    return (
      <Page title="Import finished" wide>
        <ErrorBox>{error}</ErrorBox>
        <Card className="mb-4">
          <p className="text-lg mb-4"><b className="text-green-700">{result.created.length} added</b>{result.failed.length > 0 && <> · <b className="text-red-700">{result.failed.length} not added</b></>}</p>
          <p className="mb-3 rounded-lg bg-amber-50 border border-amber-300 p-3">Download the login list <b>now</b>. Passwords are shown only once. Keep the file private.</p>
          <div className="flex flex-wrap gap-2">
            <Button disabled={!result.created.length} onClick={() => download("login-list.csv", toCsv([["student_id", "name", "password"], ...result.created.map((c) => [c.student_code, c.full_name, c.password])]))}>Download login list</Button>
            {result.failed.length > 0 && <Button variant="secondary" onClick={() => download("not-added.csv", badCsv(result.failed))}>Download rows not added</Button>}
            <Link to="/admin/students" className="rounded-md border-2 border-indigo-600 px-4 py-3 font-semibold text-indigo-700">Go to students</Link>
          </div>
        </Card>
      </Page>
    );
  }

  return (
    <Page title="Upload students (CSV)" wide>
      <ErrorBox>{error}</ErrorBox>
      <Card className="mb-4">
        <p className="mb-3">1. <button className="text-indigo-700 underline" onClick={() => download("students-template.csv",
          toCsv([headers, ["Riya Sharma", "Rakesh Sharma", "04-05-2015", "3", ...(custom ? ["riya2015", "mango123"] : [])]]))}>Download template</button>. Columns: name, father's name, date of birth (DD-MM-YYYY), level (0 to 8){custom && <>, student_id (4–20 letters or digits, blank = automatic), password (6 or more characters, blank = automatic)</>}.</p>
        <p className="mb-3 text-sm text-slate-500">ID and password mode: <b>{custom ? "from your file" : "automatic"}</b>. Change it in Settings.</p>
        <p className="mb-2">2. Add your file</p>
        <label onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)}
          onDrop={(e) => { e.preventDefault(); setDrag(false); pick(e.dataTransfer.files[0]); }}
          className={`block cursor-pointer rounded-lg border-2 border-dashed p-8 text-center ${drag ? "border-indigo-600 bg-indigo-50" : "border-slate-300 bg-slate-50"}`}>
          <span className="block text-lg font-medium">Drag and drop your CSV file here</span>
          <span className="block text-sm text-slate-500">or click to choose a file from your computer</span>
          <input type="file" accept=".csv,text/csv" className="sr-only" onChange={(e) => pick(e.target.files?.[0])} />
        </label>
      </Card>

      {rows && (
        <Card>
          <p className="mb-3 text-lg"><b className="text-green-700">{good.length} good</b>, <b className="text-red-700">{bad.length} with problems</b></p>
          <div className="mb-4 flex flex-wrap gap-2">
            <Button disabled={!good.length || !!progress} onClick={runImport}>
              {progress ? `Adding… ${progress.done} / ${progress.total}` : `Import ${good.length} students`}
            </Button>
            {bad.length > 0 && <Button variant="secondary" onClick={() => download("rows-with-problems.csv", badCsv(bad))}>Download rows with problems</Button>}
          </div>
          <div className="max-h-[28rem] overflow-auto">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-slate-50"><tr>{["Row", "Name", "Father", "DOB", "Level", "Problem"].map((h) => <th key={h} className="p-2">{h}</th>)}</tr></thead>
              <tbody>
                {[...bad, ...good].map((r) => (
                  <tr key={r.row} className={r.errors.length ? "bg-red-50" : "border-t border-slate-100"}>
                    <td className="p-2">{r.row}</td><td className="p-2">{r.raw.full_name}</td><td className="p-2">{r.raw.father_name}</td>
                    <td className="p-2">{r.raw.dob}</td><td className="p-2">{r.raw.level}</td>
                    <td className={`p-2 ${r.errors.length ? "text-red-700" : "text-green-700"}`}>{r.errors.join("; ") || "OK"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </Page>
  );
}
