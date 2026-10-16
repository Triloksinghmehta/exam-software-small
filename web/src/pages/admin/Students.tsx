import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { Button, Card, ErrorBox, Field, Page, download, toCsv } from "../../components/ui";
import { adminStudents, friendly, supabase } from "../../lib/supabase";
import type { Student } from "../../lib/auth";
import { checkRow } from "../../../../supabase/functions/_shared/student-row";

const LEVELS = [0, 1, 2, 3, 4, 5, 6, 7, 8];
const fmtDob = (d: string) => d.split("-").reverse().join("-"); // YYYY-MM-DD -> DD-MM-YYYY
type Created = { student_code: string; full_name: string; password: string };

export default function Students() {
  const [list, setList] = useState<Student[] | null>(null);
  const [error, setError] = useState("");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("");
  const [editing, setEditing] = useState<Student | "new" | null>(null);
  const [shown, setShown] = useState<Created | null>(null); // a password shown once

  async function reload() {
    const { data, error } = await supabase.from("students").select("*").order("student_code");
    if (error) setError(friendly(error)); else setList(data);
  }
  useEffect(() => { reload(); }, []);

  const rows = useMemo(() => (list ?? []).filter((s) =>
    (level === "" || s.level === Number(level)) &&
    (!q || `${s.student_code} ${s.full_name} ${s.father_name}`.toLowerCase().includes(q.toLowerCase()))), [list, q, level]);

  async function reset(s: Student) {
    if (!confirm(`Make a new password for ${s.full_name} (${s.student_code})? The old one stops working.`)) return;
    try { setShown({ ...(await adminStudents<Created>({ action: "reset_password", student_id: s.id })), full_name: s.full_name }); }
    catch (e) { setError(friendly(e)); }
  }
  async function toggle(s: Student) {
    const status = s.status === "active" ? "disabled" : "active";
    const { error } = await supabase.from("students").update({ status }).eq("id", s.id);
    if (error) setError(friendly(error)); else reload();
  }

  return (
    <Page title="Students" wide>
      <ErrorBox>{error}</ErrorBox>
      {shown && (
        <Card className="mb-4 border-2 border-green-600">
          <p className="mb-2">Give these to <b>{shown.full_name}</b>. The password is shown <b>only now</b>.</p>
          <p className="text-xl">ID: <b>{shown.student_code}</b> · Password: <b className="font-mono">{shown.password}</b></p>
          <Button variant="secondary" className="mt-3" onClick={() => setShown(null)}>Done</Button>
        </Card>
      )}
      <div className="mb-4 flex flex-wrap gap-2">
        <Button onClick={() => setEditing("new")}>Add student</Button>
        <Link to="/admin/students/import" className="rounded-xl bg-blue-600 px-4 py-3 font-semibold text-white hover:bg-blue-700">Upload CSV</Link>
        <Button variant="secondary" disabled={!rows.length} onClick={() => download("students.csv", toCsv([
          ["student_id", "full_name", "father_name", "dob", "level", "status"],
          ...rows.map((s) => [s.student_code, s.full_name, s.father_name, fmtDob(s.dob), s.level, s.status])]))}>Download list</Button>
      </div>
      {editing && <StudentForm student={editing === "new" ? null : editing} onDone={(c) => { setEditing(null); if (c) setShown(c); reload(); }} />}
      <div className="mb-3 flex flex-wrap gap-2">
        <input aria-label="Search" className="flex-1 min-w-48 rounded-lg border border-slate-300 bg-white px-3 py-3" placeholder="Search name or ID" value={q} onChange={(e) => setQ(e.target.value)} />
        <select aria-label="Level" className="rounded-lg border border-slate-300 bg-white px-3 py-3" value={level} onChange={(e) => setLevel(e.target.value)}>
          <option value="">All levels</option>
          {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
        </select>
      </div>
      {list === null ? <p>Loading…</p> : list.length === 0 ? (
        <Card><p>No students yet. <Link className="text-blue-700 underline" to="/admin/students/import">Upload a CSV</Link> to add many at once.</p></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50"><tr>{["ID", "Name", "Father", "DOB", "Level", "Status", ""].map((h) => <th key={h} className="p-3">{h}</th>)}</tr></thead>
            <tbody>
              {rows.map((s) => (
                <tr key={s.id} className="border-t border-slate-100">
                  <td className="p-3 font-mono">{s.student_code}</td>
                  <td className="p-3">{s.full_name}</td>
                  <td className="p-3">{s.father_name}</td>
                  <td className="p-3">{fmtDob(s.dob)}</td>
                  <td className="p-3">{s.level}</td>
                  <td className={`p-3 ${s.status === "active" ? "text-green-700" : "text-red-700"}`}>{s.status === "active" ? "Active" : "Disabled"}</td>
                  <td className="p-3 whitespace-nowrap space-x-3">
                    <button className="text-blue-700 underline" onClick={() => setEditing(s)}>Edit</button>
                    <button className="text-blue-700 underline" onClick={() => reset(s)}>Reset password</button>
                    <button className="text-red-700 underline" onClick={() => toggle(s)}>{s.status === "active" ? "Disable" : "Enable"}</button>
                  </td>
                </tr>
              ))}
              {!rows.length && <tr><td className="p-3" colSpan={7}>No students match.</td></tr>}
            </tbody>
          </table>
        </Card>
      )}
    </Page>
  );
}

function StudentForm({ student, onDone }: { student: Student | null; onDone: (created?: Created) => void }) {
  const [f, setF] = useState({
    full_name: student?.full_name ?? "", father_name: student?.father_name ?? "",
    dob: student ? fmtDob(student.dob) : "", level: String(student?.level ?? 0),
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const set = (k: keyof typeof f) => (e: { target: { value: string } }) => setF({ ...f, [k]: e.target.value });

  async function save(e: FormEvent) {
    e.preventDefault();
    setBusy(true); setError("");
    try {
      if (student) {
        const c = checkRow(f);
        if (!c.ok) throw new Error(c.errors.join(", "));
        const { error } = await supabase.from("students").update(c.value).eq("id", student.id);
        if (error) throw new Error(error.code === "23505" ? "Another student has the same name, father's name and DOB" : error.message);
        onDone();
      } else {
        const r = await adminStudents<{ created: Created[]; failed: { errors: string[] }[] }>({ action: "create", rows: [f] });
        if (r.failed.length) throw new Error(r.failed[0].errors.join(", "));
        onDone(r.created[0]);
      }
    } catch (err) {
      setError(friendly(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <Card className="mb-4">
      <h2 className="mb-3 text-xl font-bold">{student ? `Edit ${student.student_code}` : "Add student"}</h2>
      <form onSubmit={save} className="grid gap-x-4 sm:grid-cols-2">
        <div className="sm:col-span-2"><ErrorBox>{error}</ErrorBox></div>
        <Field label="Student name" value={f.full_name} onChange={set("full_name")} required />
        <Field label="Father's name" value={f.father_name} onChange={set("father_name")} required />
        <Field label="Date of birth (DD-MM-YYYY)" value={f.dob} onChange={set("dob")} placeholder="04-05-2015" required />
        <label className="block mb-4">
          <span className="block mb-1 font-medium">Level</span>
          <select className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg" value={f.level} onChange={set("level")}>
            {LEVELS.map((l) => <option key={l} value={l}>Level {l}</option>)}
          </select>
        </label>
        <div className="flex gap-2 sm:col-span-2">
          <Button disabled={busy}>{busy ? "Saving…" : "Save"}</Button>
          <Button type="button" variant="secondary" onClick={() => onDone()}>Cancel</Button>
        </div>
      </form>
    </Card>
  );
}
