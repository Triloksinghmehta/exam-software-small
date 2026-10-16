// Admin-only: create students (single or CSV batch) and reset passwords.
// Creates Supabase Auth users, so it needs the service role key (never sent to the browser).
import { createClient } from "npm:@supabase/supabase-js@2.49.4";
import { checkRow, identityKey } from "../_shared/student-row.ts";

const EMAIL_DOMAIN = Deno.env.get("STUDENT_EMAIL_DOMAIN") ?? "students.local";
const MAX_BATCH = 50; // client sends CSVs in chunks so each call stays well under the function time limit
const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};
const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

// No 0/O/1/l/I: passwords are read off paper by children
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";
function tempPassword(len = 8) {
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return json("ok");
  if (req.method !== "POST") return json({ error: "POST only" }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const caller = createClient(url, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: req.headers.get("Authorization") ?? "" } },
  });
  const { data: isAdmin, error: adminErr } = await caller.rpc("is_admin");
  if (adminErr || !isAdmin) return json({ error: "NOT_ALLOWED" }, 403);
  const { data: { user: actor } } = await caller.auth.getUser();
  const db = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  let body: { action?: string; rows?: Record<string, unknown>[]; student_id?: string };
  try { body = await req.json(); } catch { return json({ error: "Bad JSON" }, 400); }

  if (body.action === "reset_password") {
    if (!body.student_id) return json({ error: "student_id required" }, 400);
    const { data: s } = await db.from("students").select("id, student_code").eq("id", body.student_id).maybeSingle();
    if (!s) return json({ error: "NOT_FOUND" }, 404);
    const password = tempPassword();
    const { error } = await db.auth.admin.updateUserById(s.id, { password });
    if (error) return json({ error: error.message }, 500);
    await db.from("students").update({ must_change_password: true }).eq("id", s.id);
    await db.auth.admin.signOut(s.id).catch(() => {}); // end existing logins (best effort)
    await db.from("audit_events").insert({ actor: actor?.id, action: "reset_password", target: s.student_code });
    return json({ student_code: s.student_code, password });
  }

  if (body.action === "create") {
    const rows = body.rows ?? [];
    if (!Array.isArray(rows) || rows.length === 0 || rows.length > MAX_BATCH) return json({ error: `Send 1-${MAX_BATCH} rows` }, 400);
    const created: { row: number; student_code: string; full_name: string; password: string }[] = [];
    const failed: { row: number; errors: string[] }[] = [];
    const seen = new Set<string>();

    for (let i = 0; i < rows.length; i++) {
      const rowNo = Number(rows[i].row ?? i + 1);
      const c = checkRow(rows[i]);
      if (!c.ok) { failed.push({ row: rowNo, errors: c.errors }); continue; }
      const s = c.value;
      const key = identityKey(s);
      if (seen.has(key)) { failed.push({ row: rowNo, errors: ["Duplicate in file"] }); continue; }
      seen.add(key);

      const { data: code, error: codeErr } = await db.rpc("next_student_code");
      if (codeErr) { failed.push({ row: rowNo, errors: ["Server error: " + codeErr.message] }); continue; }
      const password = tempPassword();
      const { data: au, error: authErr } = await db.auth.admin.createUser({
        email: `${String(code).toLowerCase()}@${EMAIL_DOMAIN}`, password, email_confirm: true,
      });
      if (authErr || !au.user) { failed.push({ row: rowNo, errors: ["Server error: " + authErr?.message] }); continue; }

      const id = au.user.id;
      const p = await db.from("profiles").insert({ id, role: "student" });
      const st = p.error ? p : await db.from("students").insert({ id, student_code: code, ...s });
      if (st.error) {
        await db.auth.admin.deleteUser(id); // undo: no half-created student (cascades the profile)
        failed.push({ row: rowNo, errors: [st.error.code === "23505" ? "Already exists (same name, father's name, DOB)" : "Server error: " + st.error.message] });
        continue;
      }
      created.push({ row: rowNo, student_code: code, full_name: s.full_name, password });
    }
    if (created.length) {
      await db.from("audit_events").insert({ actor: actor?.id, action: "create_students", details: { count: created.length, codes: created.map((c) => c.student_code) } });
    }
    return json({ created, failed });
  }

  return json({ error: "Unknown action" }, 400);
});
