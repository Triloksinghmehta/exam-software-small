// Shared UI pieces. Big touch targets, plain words (roadmap.md UI rule), modern dashboard look.
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const v = {
    primary: "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700 active:scale-[0.98]",
    secondary: "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 hover:border-slate-400",
    danger: "bg-white text-red-700 border border-red-300 hover:bg-red-50",
  }[variant];
  return <button {...p} className={`rounded-xl px-4 py-3 text-base font-semibold transition disabled:opacity-50 disabled:pointer-events-none ${v} ${className}`} />;
}

// A link that looks like a Button (use instead of <Link className="bg-...">)
export function LinkButton({ to, variant = "primary", className = "", children }: { to: string; variant?: "primary" | "secondary"; className?: string; children: ReactNode }) {
  const v = variant === "primary"
    ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/20 hover:bg-indigo-700"
    : "bg-white text-slate-700 border border-slate-300 hover:bg-slate-50";
  return <Link to={to} className={`inline-block rounded-xl px-4 py-3 text-center text-base font-semibold transition ${v} ${className}`}>{children}</Link>;
}

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">{label}</span>
      <input {...p} className="w-full rounded-xl border border-slate-300 bg-white px-3.5 py-3 text-base shadow-sm placeholder:text-slate-400 disabled:bg-slate-100" />
    </label>
  );
}

export const ErrorBox = ({ children }: { children: ReactNode }) =>
  children ? <p role="alert" className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{children}</p> : null;

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm ${className}`}>{children}</div>;

export function Badge({ tone = "slate", children }: { tone?: "slate" | "green" | "amber" | "red" | "indigo"; children: ReactNode }) {
  const t = { slate: "bg-slate-100 text-slate-700", green: "bg-emerald-100 text-emerald-800", amber: "bg-amber-100 text-amber-800", red: "bg-red-100 text-red-800", indigo: "bg-indigo-100 text-indigo-800" }[tone];
  return <span className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${t}`}>{children}</span>;
}

export function StatCard({ label, value, icon, tone = "indigo" }: { label: string; value: ReactNode; icon: ReactNode; tone?: "indigo" | "emerald" | "amber" | "sky" }) {
  const t = { indigo: "bg-indigo-100 text-indigo-600", emerald: "bg-emerald-100 text-emerald-600", amber: "bg-amber-100 text-amber-600", sky: "bg-sky-100 text-sky-600" }[tone];
  return (
    <Card className="flex items-center gap-4">
      <span className={`grid h-12 w-12 shrink-0 place-items-center rounded-xl ${t}`}>{icon}</span>
      <div><p className="text-sm text-slate-500">{label}</p><b className="text-3xl font-bold tracking-tight">{value}</b></div>
    </Card>
  );
}

export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="inline-flex rounded-xl bg-slate-100 p-1">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`rounded-lg px-5 py-2 text-sm font-semibold transition ${value === v ? "bg-white text-indigo-700 shadow-sm" : "text-slate-600 hover:text-slate-900"}`}>{label}</button>
      ))}
    </div>
  );
}

export function Page({ title, children, wide, actions }: { title: string; children: ReactNode; wide?: boolean; actions?: ReactNode }) {
  return (
    <main className={`mx-auto w-full px-4 py-6 sm:px-6 sm:py-8 ${wide ? "max-w-6xl" : "max-w-xl"}`}>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">{title}</h1>
        {actions}
      </div>
      {children}
    </main>
  );
}

// Login-style pages: brand, one centred card
export function Centered({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <div className="w-full max-w-sm">
        <div className="mb-6 text-center">
          <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-indigo-600 text-white shadow-lg shadow-indigo-600/30"><Icon name="abacus" className="h-7 w-7" /></span>
          <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
          {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
        </div>
        <Card className="p-6 shadow-md">{children}</Card>
      </div>
    </main>
  );
}

// ---- icons (inline SVG, no extra library) ----
const PATHS: Record<string, string> = {
  home: "M3 11l9-8 9 8M5 10v10h5v-6h4v6h5V10",
  students: "M17 20v-2a4 4 0 00-4-4H7a4 4 0 00-4 4v2M10 10a4 4 0 100-8 4 4 0 000 8zM21 20v-2a4 4 0 00-3-3.9M16 2.1a4 4 0 010 7.8",
  exams: "M9 12l2 2 4-4M7 3h10a2 2 0 012 2v14a2 2 0 01-2 2H7a2 2 0 01-2-2V5a2 2 0 012-2z",
  levels: "M4 20h4V10H4zM10 20h4V4h-4zM16 20h4v-7h-4z",
  settings: "M12 15a3 3 0 100-6 3 3 0 000 6zM19.4 15a1.7 1.7 0 00.3 1.8l.1.1a2 2 0 11-2.8 2.8l-.1-.1a1.7 1.7 0 00-1.8-.3 1.7 1.7 0 00-1 1.5V21a2 2 0 11-4 0v-.1a1.7 1.7 0 00-1.1-1.5 1.7 1.7 0 00-1.8.3l-.1.1a2 2 0 11-2.8-2.8l.1-.1a1.7 1.7 0 00.3-1.8 1.7 1.7 0 00-1.5-1H3a2 2 0 110-4h.1a1.7 1.7 0 001.5-1.1 1.7 1.7 0 00-.3-1.8l-.1-.1a2 2 0 112.8-2.8l.1.1a1.7 1.7 0 001.8.3H9a1.7 1.7 0 001-1.5V3a2 2 0 114 0v.1a1.7 1.7 0 001 1.5 1.7 1.7 0 001.8-.3l.1-.1a2 2 0 112.8 2.8l-.1.1a1.7 1.7 0 00-.3 1.8V9a1.7 1.7 0 001.5 1H21a2 2 0 110 4h-.1a1.7 1.7 0 00-1.5 1z",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  clock: "M12 6v6l4 2M12 22a10 10 0 100-20 10 10 0 000 20z",
  check: "M5 13l4 4L19 7",
  pencil: "M12 20h9M16.5 3.5a2.1 2.1 0 013 3L7 19l-4 1 1-4z",
  x: "M6 6l12 12M18 6L6 18",
  minus: "M5 12h14",
  alert: "M12 9v4M12 17h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0z",
  abacus: "M4 4v16M20 4v16M4 8h16M4 16h16M9 5v6M14 13v6",
};
export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS | string; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={PATHS[name]} /></svg>;
}

// ---- admin shell: sidebar on desktop, scrolling pills on phone ----
const ADMIN_NAV = [
  { to: "/admin", label: "Dashboard", icon: "home", end: true },
  { to: "/admin/students", label: "Students", icon: "students" },
  { to: "/admin/exams", label: "Exams", icon: "exams" },
  { to: "/admin/levels", label: "Levels", icon: "levels" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];

export function AdminShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const email = session?.user.email ?? "";
  const link = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition ${isActive ? "bg-indigo-600 text-white shadow-sm shadow-indigo-600/30" : "text-slate-600 hover:bg-slate-100"}`;
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 bg-white/80 p-4 backdrop-blur md:sticky md:top-0 md:flex md:h-screen">
        <div className="mb-6 flex items-center gap-3 px-2 pt-2">
          <span className="grid h-10 w-10 place-items-center rounded-xl bg-indigo-600 text-white"><Icon name="abacus" /></span>
          <div><b className="block leading-tight">Abacus Exam</b><span className="text-xs text-slate-500">Admin panel</span></div>
        </div>
        <nav className="flex flex-col gap-1">
          {ADMIN_NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}><Icon name={n.icon} />{n.label}</NavLink>)}
        </nav>
        <div className="mt-auto border-t border-slate-200 pt-4">
          <p className="mb-2 truncate px-2 text-xs text-slate-500">{email}</p>
          <button onClick={() => supabase.auth.signOut()} className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-600 hover:bg-slate-100"><Icon name="logout" />Logout</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <b className="flex items-center gap-2"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-600 text-white"><Icon name="abacus" className="h-4 w-4" /></span>Abacus Admin</b>
            <button aria-label="Logout" onClick={() => supabase.auth.signOut()} className="rounded-lg p-2 text-slate-600 hover:bg-slate-100"><Icon name="logout" /></button>
          </div>
          <nav className="flex gap-2 overflow-x-auto px-4 pb-3">
            {ADMIN_NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `whitespace-nowrap rounded-full px-4 py-2 text-sm font-medium ${isActive ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-700"}`}>{n.label}</NavLink>)}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

// ---- student shell: slim top bar with name, level and logout ----
export function StudentShell({ children }: { children: ReactNode }) {
  const { student } = useAuth();
  const initials = (student?.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-6">
          <Link to="/" className="flex items-center gap-2 font-bold"><span className="grid h-9 w-9 place-items-center rounded-xl bg-indigo-600 text-white"><Icon name="abacus" className="h-5 w-5" /></span><span className="hidden sm:inline">Abacus Exam</span></Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight"><b className="block text-sm">{student?.full_name}</b><span className="text-xs text-slate-500">{student?.student_code} · Level {student?.level}</span></div>
            <span className="grid h-10 w-10 place-items-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">{initials}</span>
            <button aria-label="Logout" onClick={() => supabase.auth.signOut()} className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"><Icon name="logout" /></button>
          </div>
        </div>
      </header>
      {children}
    </div>
  );
}

// Download text as a file (CSV exports, login lists)
export function download(name: string, text: string) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["﻿" + text], { type: "text/csv;charset=utf-8" })); // BOM: Excel opens UTF-8 correctly
  a.download = name;
  a.click();
  URL.revokeObjectURL(a.href);
}

// CSV cell: quote, and neutralise =+-@ so Excel doesn't run it as a formula (CSV injection)
export const csvCell = (v: unknown) => {
  let s = String(v ?? "");
  if (/^[=+\-@\t\r]/.test(s)) s = "'" + s;
  return `"${s.replace(/"/g, '""')}"`;
};
export const toCsv = (rows: unknown[][]) => rows.map((r) => r.map(csvCell).join(",")).join("\r\n");
