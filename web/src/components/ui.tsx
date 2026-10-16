// Shared UI. Direction: quiet and scholarly. Ink navy, warm ivory, one brass accent; flat panels with hairlines;
// serif display headings; big touch targets and plain words (roadmap.md UI rule).
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { supabase } from "../lib/supabase";
import { useAuth } from "../lib/auth";

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const v = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  }[variant];
  return <button {...p} className={`rounded-md px-4 py-3 text-[15px] font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 ${v} ${className}`} />;
}

// A link that looks like a Button
export function LinkButton({ to, variant = "primary", className = "", children }: { to: string; variant?: "primary" | "secondary"; className?: string; children: ReactNode }) {
  const v = variant === "primary" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100";
  return <Link to={to} className={`inline-block rounded-md px-4 py-3 text-center text-[15px] font-medium transition-colors ${v} ${className}`}>{children}</Link>;
}

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      <input {...p} className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-[15px] placeholder:text-slate-400 disabled:bg-slate-100" />
    </label>
  );
}

export const ErrorBox = ({ children }: { children: ReactNode }) =>
  children ? <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{children}</p> : null;

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-lg border border-slate-200 bg-white p-5 ${className}`}>{children}</div>;

// Small label with a status dot. No filled pills.
export function Badge({ tone = "slate", children }: { tone?: "slate" | "green" | "amber" | "red" | "indigo"; children: ReactNode }) {
  const dot = { slate: "bg-slate-400", green: "bg-emerald-600", amber: "bg-brass-500", red: "bg-red-600", indigo: "bg-indigo-600" }[tone];
  return <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-xs font-medium text-slate-700"><span className={`h-1.5 w-1.5 rounded-full ${dot}`} />{children}</span>;
}

// One connected strip of key numbers (instead of separate cards)
export function StatStrip({ items }: { items: { label: string; value: ReactNode; hint?: string }[] }) {
  return (
    <div className="grid grid-cols-2 overflow-hidden rounded-lg border border-slate-200 bg-white lg:grid-cols-4">
      {items.map((s, i) => (
        <div key={s.label} className={`px-5 py-5 ${i % 2 ? "border-l border-slate-200" : ""} ${i > 1 ? "border-t border-slate-200 lg:border-t-0" : ""} ${i > 0 ? "lg:border-l lg:border-slate-200" : ""}`}>
          <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">{s.label}</p>
          <p className="font-display mt-2 text-4xl font-medium leading-none text-slate-900">{s.value}</p>
          {s.hint && <p className="mt-2 text-xs text-slate-500">{s.hint}</p>}
        </div>
      ))}
    </div>
  );
}

export function Page({ title, children, wide, actions, eyebrow }: { title: string; children: ReactNode; wide?: boolean; actions?: ReactNode; eyebrow?: string }) {
  return (
    <main className={`mx-auto w-full px-4 py-8 sm:px-8 sm:py-10 ${wide ? "max-w-6xl" : "max-w-xl"}`}>
      <header className="mb-8 flex flex-wrap items-end justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-brass-600">{eyebrow}</p>}
          <h1 className="font-display text-3xl font-medium text-slate-900 sm:text-[2rem]">{title}</h1>
        </div>
        {actions}
      </header>
      {children}
    </main>
  );
}

// Underlined tabs
export function Segmented<T extends string>({ options, value, onChange }: { options: [T, string][]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="tablist" className="flex gap-7 border-b border-slate-200">
      {options.map(([v, label]) => (
        <button key={v} role="tab" aria-selected={value === v} onClick={() => onChange(v)}
          className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${value === v ? "border-brass-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>
      ))}
    </div>
  );
}

// ---- brand mark (placeholder ERPLI logo; swap public/logo.png later) ----
export function Logo({ size = 36 }: { size?: number }) {
  return <img src="/logo.png" width={size} height={size} alt="ERPLI" className="shrink-0 object-contain" />;
}

// Login-style pages: framed hero image (lg+) beside the form
export function Centered({ title, subtitle, children }: { title: string; subtitle?: string; children: ReactNode }) {
  return (
    <main className="isolate grid min-h-screen bg-slate-50 lg:grid-cols-[1.15fr_1fr] lg:p-4">
      <aside className="relative hidden overflow-hidden rounded-[28px] bg-slate-100 lg:block">
        <img src="/hero.webp" alt="" className="absolute inset-0 h-full w-full object-cover" />
        <div className="absolute inset-0 bg-gradient-to-t from-indigo-900/90 via-indigo-900/10 to-transparent" />
        <div className="absolute inset-x-10 bottom-10 text-white">
          <span className="inline-block rounded-full bg-brass-400 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-indigo-900">Online exams</span>
          <h2 className="font-display mt-4 max-w-md text-[44px] font-medium leading-[1.1]">Every bead counts. <span className="italic text-brass-400">So does every second.</span></h2>
          <div className="mt-8 flex gap-10 border-t border-white/20 pt-6 text-sm text-white/80">
            <div><b className="font-display block text-2xl font-medium text-white">Timed</b>Real exam conditions</div>
            <div><b className="font-display block text-2xl font-medium text-white">Instant</b>Results &amp; rankings</div>
            <div><b className="font-display block text-2xl font-medium text-white">Levelled</b>Papers for every stage</div>
          </div>
        </div>
      </aside>
      <div className="relative flex flex-col px-6 py-8 sm:px-12">
        {/* phones/tablets: hero image as backdrop */}
        <img src="/hero.webp" alt="" className="absolute inset-0 -z-10 h-full w-full object-cover lg:hidden" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-indigo-900/60 via-indigo-900/70 to-indigo-900/95 lg:hidden" />
        <div className="flex items-center gap-2.5"><Logo size={40} /><b className="font-display text-xl font-medium text-white lg:text-indigo-800">ERPLI</b></div>
        <div className="mx-auto my-auto w-full max-w-sm py-12">
          <h1 className="font-display text-4xl font-medium tracking-tight text-white lg:text-slate-900">{title}</h1>
          {subtitle && <p className="mt-2 text-white/85 lg:text-slate-500">{subtitle}</p>}
          <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-brass-400 via-coral-500 to-indigo-500" />
          <Card className="mt-8 p-6 shadow-[0_20px_50px_-20px_rgb(45_40_33/0.18)]">{children}</Card>
        </div>
        <p className="text-center text-xs text-white/70 lg:text-slate-400">© {new Date().getFullYear()} ERPLI Examination Portal</p>
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
  arrow: "M5 12h14M13 6l6 6-6 6",
};
export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS | string; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={PATHS[name]} /></svg>;
}

// ---- admin shell: ink-navy sidebar on desktop, top bar with tabs on phone ----
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
    `flex items-center gap-3 border-l-2 px-5 py-2.5 text-sm font-medium transition-colors ${isActive ? "border-brass-400 bg-white/[0.07] text-white" : "border-transparent text-slate-300 hover:bg-white/[0.04] hover:text-white"}`;
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-60 shrink-0 flex-col bg-indigo-700 md:sticky md:top-0 md:flex md:h-screen">
        <div className="flex items-center gap-3 px-5 pb-8 pt-6">
          <Logo size={52} />
          <div><b className="font-display block text-[17px] font-medium leading-tight text-white">ERPLI</b><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-brass-400">Examination Portal</span></div>
        </div>
        <p className="mb-2 px-5 text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-400">Manage</p>
        <nav className="flex flex-col">
          {ADMIN_NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={link}><Icon name={n.icon} className="h-[18px] w-[18px]" />{n.label}</NavLink>)}
        </nav>
        <div className="mt-auto border-t border-white/10 px-5 py-4">
          <p className="mb-3 truncate text-xs text-slate-400">{email}</p>
          <button onClick={() => supabase.auth.signOut()} className="flex items-center gap-2 text-sm font-medium text-slate-300 hover:text-white"><Icon name="logout" className="h-[18px] w-[18px]" />Log out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-10 bg-indigo-700 md:hidden">
          <div className="flex items-center justify-between px-4 py-3">
            <b className="font-display flex items-center gap-3 font-medium text-white"><Logo size={40} />ERPLI</b>
            <button aria-label="Log out" onClick={() => supabase.auth.signOut()} className="p-2 text-slate-300"><Icon name="logout" /></button>
          </div>
          <nav className="flex gap-1 overflow-x-auto px-3">
            {ADMIN_NAV.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-medium ${isActive ? "border-brass-400 text-white" : "border-transparent text-slate-300"}`}>{n.label}</NavLink>)}
          </nav>
        </header>
        {children}
      </div>
    </div>
  );
}

// ---- student shell ----
export function StudentShell({ children }: { children: ReactNode }) {
  const { student } = useAuth();
  const initials = (student?.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-10 border-b border-slate-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-4 py-3 sm:px-8">
          <Link to="/" className="font-display flex items-center gap-3 text-lg font-medium"><Logo size={44} /><span className="hidden sm:inline">ERPLI</span></Link>
          <div className="ml-auto flex items-center gap-3">
            <div className="text-right leading-tight"><b className="block text-sm font-medium">{student?.full_name}</b><span className="text-xs text-slate-500">{student?.student_code} · Level {student?.level}</span></div>
            <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-xs font-semibold text-white">{initials}</span>
            <button aria-label="Log out" onClick={() => supabase.auth.signOut()} className="p-2 text-slate-500 hover:text-slate-900"><Icon name="logout" className="h-[18px] w-[18px]" /></button>
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
