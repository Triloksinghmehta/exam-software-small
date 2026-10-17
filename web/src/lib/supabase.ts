import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY);

// Local sign-out: clears this browser's session without a server call, so it works even when the
// server already revoked the session (newer login elsewhere, password reset) and answers 403.
export async function logOut(to = "/login") {
  await supabase.auth.signOut({ scope: "local" }).catch(() => {});
  Object.keys(localStorage).filter((k) => k.startsWith("sb-")).forEach((k) => localStorage.removeItem(k)); // belt and braces
  window.location.replace(to);
}

// ADR-0002: student ID -> hidden login email
export const studentEmail = (code: string) =>
  `${code.trim().toLowerCase()}@${import.meta.env.VITE_STUDENT_EMAIL_DOMAIN ?? "students.local"}`;

// Calls the admin-students Edge Function; throws with a readable message
export const adminStudents = <T,>(body: object) => callFunction<T>("admin-students", body);

// Plain-language messages for server error codes (docs/workflows.md)
const MESSAGES: Record<string, string> = {
  "Invalid login credentials": "Wrong ID or password",
  NOT_ALLOWED: "You are not allowed to do this",
  SESSION_REPLACED: "You logged in on another device. Please log in again.",
  NOT_OPEN_YET: "This exam is not open yet.",
  CLOSED: "This exam is closed.",
  NO_TRIES_LEFT: "You have no tries left for this exam.",
  PAPER_RULES_INVALID: "This exam's question settings have a problem. Please tell your teacher.",
  PAPER_NOT_READY: "Your paper is still being made. Please try again.",
};
// Every error path goes through friendly(), so this one place opens the "logged in elsewhere" popup (see SessionReplacedDialog)
export const SESSION_REPLACED_EVENT = "session-replaced";
export const friendly = (e: unknown) => {
  // Supabase errors are plain objects ({message}), not Error instances
  const m = e instanceof Error ? e.message : typeof e === "object" && e && "message" in e ? String((e as { message: unknown }).message) : String(e);
  if (m.includes("SESSION_REPLACED")) window.dispatchEvent(new Event(SESSION_REPLACED_EVENT));
  return Object.entries(MESSAGES).find(([k]) => m.includes(k))?.[1] ?? (m === "Failed to fetch" ? "Can't connect. Check internet." : m);
};

// Calls an Edge Function as the logged-in user; throws with the server's error code/message
export async function callFunction<T>(name: string, body: object): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    const msg = await error.context?.json?.().then((j: { error?: string }) => j.error).catch(() => null);
    throw new Error(msg ?? error.message);
  }
  return data as T;
}
