import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// ADR-0002: student ID -> hidden login email
export const studentEmail = (code: string) =>
  `${code.trim().toLowerCase()}@${import.meta.env.VITE_STUDENT_EMAIL_DOMAIN ?? "students.local"}`;

// Calls the admin-students Edge Function; throws with a readable message
export async function adminStudents<T>(body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke("admin-students", { body });
  if (error) {
    const msg = await error.context?.json?.().then((j: { error?: string }) => j.error).catch(() => null);
    throw new Error(msg ?? error.message);
  }
  return data as T;
}

// Plain-language messages for server error codes (docs/workflows.md)
const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Wrong ID or password",
  NOT_ALLOWED: "You are not allowed to do this",
  SESSION_REPLACED: "You logged in on another device. Please log in again.",
};
export const friendly = (e: unknown) => {
  const m = e instanceof Error ? e.message : String(e);
  return Object.entries(MESSAGES).find(([k]) => m.includes(k))?.[1] ?? (m === "Failed to fetch" ? "Can't connect. Check internet." : m);
};
