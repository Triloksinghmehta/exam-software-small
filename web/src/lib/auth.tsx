import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "./supabase";

export type Student = {
  id: string; student_code: string; full_name: string; father_name: string; dob: string;
  level: number; status: "active" | "disabled"; must_change_password: boolean; password_shared: boolean;
};
type Me = { session: Session | null; role: "admin" | "student" | null; student: Student | null };
type Ctx = Me & { loading: boolean; refresh: () => Promise<void> };

const AuthCtx = createContext<Ctx>(null!);
export const useAuth = () => useContext(AuthCtx);

async function load(session: Session | null): Promise<Me> {
  if (!session) return { session, role: null, student: null };
  // The saved token can outlive its server session (newer login elsewhere, password reset, logout).
  // Ask the server; if the session is gone, drop the saved copy instead of looking logged in.
  const { error } = await supabase.auth.getUser();
  if (error && error.status && error.status < 500) {
    await supabase.auth.signOut({ scope: "local" }).catch(() => {});
    return { session: null, role: null, student: null };
  }
  const uid = session.user.id;
  const [{ data: p }, { data: s }] = await Promise.all([
    supabase.from("profiles").select("role").eq("id", uid).maybeSingle(),
    supabase.from("students").select("*").eq("id", uid).maybeSingle(),
  ]);
  return { session, role: p?.role ?? null, student: s };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>({ session: null, role: null, student: null });
  const [loading, setLoading] = useState(true);
  const refresh = async () => setMe(await load((await supabase.auth.getSession()).data.session));

  useEffect(() => {
    refresh().finally(() => setLoading(false));
    const { data } = supabase.auth.onAuthStateChange((event, session) => {
      // Defer: calling supabase inside this callback can deadlock the client
      if (event === "SIGNED_IN" || event === "SIGNED_OUT" || event === "USER_UPDATED") setTimeout(() => load(session).then(setMe), 0);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  return <AuthCtx.Provider value={{ ...me, loading, refresh }}>{children}</AuthCtx.Provider>;
}
