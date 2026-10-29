// Shared UI. Direction: quiet and scholarly. Ink navy, warm ivory, one brass accent; flat panels with hairlines;
// serif display headings; big touch targets and plain words (roadmap.md UI rule).
import { useEffect, useRef, useState } from "react";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link, NavLink } from "react-router-dom";
import { SESSION_REPLACED_EVENT, logOut } from "../lib/supabase";
import { useAuth } from "../lib/auth";

const PRESS = "active:scale-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-600 focus-visible:ring-offset-2";
const Spinner = ({ className = "h-4 w-4" }: { className?: string }) => <span aria-hidden="true" className={`inline-block animate-spin rounded-full border-2 border-current border-t-transparent ${className}`} />;

// Press feedback (sinks slightly) and, when onClick returns a promise, a spinner with the button disabled until it finishes.
export function Button({ variant = "primary", className = "", onClick, disabled, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const [pending, setPending] = useState(false);
  const v = {
    primary: "bg-indigo-600 text-white hover:bg-indigo-700",
    secondary: "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100",
    danger: "border border-red-300 bg-white text-red-700 hover:bg-red-50",
  }[variant];
  async function click(e: Parameters<NonNullable<typeof onClick>>[0]) {
    const r: unknown = onClick!(e);
    if (r && typeof (r as Promise<unknown>).then === "function") {
      setPending(true);
      try { await r; } finally { setPending(false); }
    }
  }
  return (
    <button {...p} onClick={onClick ? click : undefined} disabled={disabled || pending} aria-busy={pending || undefined}
      className={`rounded-md px-4 py-3 text-[15px] font-medium transition disabled:pointer-events-none disabled:opacity-60 ${PRESS} ${v} ${className}`}>
      {pending ? <span className="inline-flex items-center justify-center gap-2"><Spinner />{children}</span> : children}
    </button>
  );
}

// A link that looks like a Button
export function LinkButton({ to, variant = "primary", className = "", children }: { to: string; variant?: "primary" | "secondary"; className?: string; children: ReactNode }) {
  const v = variant === "primary" ? "bg-indigo-600 text-white hover:bg-indigo-700" : "border border-slate-300 bg-white text-slate-800 hover:bg-slate-100";
  return <Link to={to} className={`inline-block rounded-md px-4 py-3 text-center text-[15px] font-medium transition ${PRESS} ${v} ${className}`}>{children}</Link>;
}

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="mb-4 block">
      <span className="mb-1.5 block text-[13px] font-medium text-slate-700">{label}</span>
      <input {...p} className="w-full rounded-md border border-slate-300 bg-white px-3.5 py-3 text-[15px] placeholder:text-slate-400 disabled:bg-slate-100" />
    </label>
  );
}

// On/off slider. Put it inside a <label> so a click anywhere on the row flips it.
export function Toggle(p: Omit<InputHTMLAttributes<HTMLInputElement>, "type" | "className">) {
  return (
    <span className="relative inline-flex shrink-0 cursor-pointer">
      <input {...p} type="checkbox" role="switch" className="peer sr-only" />
      <span className="relative h-7 w-12 rounded-full bg-slate-300 transition-colors after:absolute after:left-0.5 after:top-0.5 after:h-6 after:w-6 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:bg-indigo-600 peer-checked:after:translate-x-5 peer-focus-visible:ring-2 peer-focus-visible:ring-indigo-600 peer-focus-visible:ring-offset-2 peer-disabled:opacity-50" />
    </span>
  );
}

// Styled replacement for window.confirm. Usage: const [ask, dialog] = useConfirm(); if (!(await ask({...}))) return; ... render {dialog}
type AskOpts = { title: string; message: string; yes?: string; no?: string; tone?: "primary" | "danger"; icon?: string };
export function useConfirm() {
  const [st, setSt] = useState<(AskOpts & { done: (v: boolean) => void }) | null>(null);
  const ask = (o: AskOpts) => new Promise<boolean>((done) => setSt({ ...o, done }));
  const close = (v: boolean) => { st?.done(v); setSt(null); };
  const danger = st?.tone === "danger";
  const dialog = st && (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-900/50 p-4 backdrop-blur-[2px]" onClick={() => close(false)} onKeyDown={(e) => e.key === "Escape" && close(false)}>
      <div role="dialog" aria-modal="true" aria-labelledby="confirm-title" onClick={(e) => e.stopPropagation()} className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl">
        <span className={`mb-4 grid h-12 w-12 place-items-center rounded-xl ${danger ? "bg-red-100 text-red-700" : "bg-brass-400/25 text-brass-600"}`}><Icon name={st.icon ?? "alert"} className="h-6 w-6" /></span>
        <h2 id="confirm-title" className="font-display text-2xl font-medium text-slate-900">{st.title}</h2>
        <p className="mt-2 text-slate-600">{st.message}</p>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <Button variant="secondary" autoFocus onClick={() => close(false)}>{st.no ?? "Cancel"}</Button>
          <Button variant={danger ? "danger" : "primary"} onClick={() => close(true)}>{st.yes ?? "Yes"}</Button>
        </div>
      </div>
    </div>
  );
  return [ask, dialog] as const;
}

// Three-dot actions menu. Positioned with `fixed` so scrolling tables don't clip it.
export type MenuItem = { label: string; icon: string; onClick: () => void | Promise<unknown>; danger?: boolean };
export function RowMenu({ items, label }: { items: MenuItem[]; label: string }) {
  const [pos, setPos] = useState<{ top: number; right: number } | null>(null);
  const [working, setWorking] = useState(false);
  const btn = useRef<HTMLButtonElement>(null);
  const close = () => setPos(null);
  useEffect(() => {
    if (!pos) return;
    const off = (e: Event) => { if (e.type !== "keydown" || (e as KeyboardEvent).key === "Escape") close(); };
    window.addEventListener("scroll", off, true); window.addEventListener("resize", off); window.addEventListener("keydown", off);
    return () => { window.removeEventListener("scroll", off, true); window.removeEventListener("resize", off); window.removeEventListener("keydown", off); };
  }, [pos]);
  function toggle() {
    if (pos) return close();
    const r = btn.current!.getBoundingClientRect();
    const flip = r.bottom + items.length * 44 + 16 > window.innerHeight; // open upwards near the bottom of the screen
    setPos({ top: flip ? r.top - items.length * 44 - 12 : r.bottom + 4, right: window.innerWidth - r.right });
  }
  return (
    <>
      <button ref={btn} aria-label={label} aria-haspopup="menu" aria-expanded={!!pos} aria-busy={working || undefined} disabled={working} onClick={toggle}
        className="grid h-9 w-9 place-items-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 active:scale-95 aria-expanded:bg-slate-100">
        {working ? <Spinner className="h-5 w-5" /> : <Icon name="dots" className="h-5 w-5" />}
      </button>
      {pos && (
        <>
          <div className="fixed inset-0 z-40" onClick={close} />
          <div role="menu" style={{ top: pos.top, right: pos.right }} className="fixed z-50 w-56 rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl">
            {items.map((it, i) => (
              <button key={it.label} role="menuitem" onClick={async () => { close(); const r: unknown = it.onClick(); if (r && typeof (r as Promise<unknown>).then === "function") { setWorking(true); try { await r; } finally { setWorking(false); } } }}
                className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm font-medium transition-colors ${it.danger ? "text-red-700 hover:bg-red-50" : "text-slate-700 hover:bg-slate-100"} ${it.danger && i > 0 ? "mt-1 border-t border-slate-100 pt-3" : ""}`}>
                <Icon name={it.icon} className="h-[18px] w-[18px]" />{it.label}
              </button>
            ))}
          </div>
        </>
      )}
    </>
  );
}

export const ErrorBox = ({ children }: { children: ReactNode }) =>
  children ? <p role="alert" className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">{children}</p> : null;

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${className}`}>{children}</div>;

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
          {eyebrow && <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.12em] text-indigo-600">{eyebrow}</p>}
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
          className={`-mb-px border-b-2 pb-3 text-sm font-medium transition-colors ${value === v ? "border-indigo-500 text-slate-900" : "border-transparent text-slate-500 hover:text-slate-800"}`}>{label}</button>
      ))}
    </div>
  );
}

// ---- brand mark (placeholder logo; swap public/logo.png later) ----
export function Logo({ size = 36 }: { size?: number }) {
  return <img src="/logo.png" width={size} height={size} alt="VODMON Demo" className="shrink-0 object-contain" />;
}

// full-screen splash shown while the session is restored on refresh
export function Splash() {
  return (
    <main role="status" aria-label="Loading" className="grid min-h-screen place-items-center bg-slate-50">
      <div className="flex flex-col items-center gap-5">
        <div className="relative grid h-24 w-24 place-items-center">
          <span className="absolute inset-0 animate-spin rounded-full border-4 border-indigo-100 border-t-indigo-600" />
          <span className="animate-pulse"><Logo size={56} /></span>
        </div>
        <p className="text-lg font-semibold tracking-wide text-indigo-900">VODMON Demo</p>
        <div className="flex gap-1.5">
          {[0, 150, 300].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-brass-500" style={{ animationDelay: `${d}ms` }} />)}
        </div>
      </div>
    </main>
  );
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
        <img src="/hero.webp" alt="" className="absolute inset-x-0 top-0 -z-10 h-[46vh] w-full max-lg:top-16 object-cover object-[50%_30%] lg:hidden" />
        <div className="absolute inset-x-0 top-16 -z-10 h-[46vh] bg-gradient-to-b from-slate-50 from-0% via-slate-50/0 via-15% to-slate-50 to-100% lg:hidden" />
        <div className="flex items-center gap-2 max-lg:justify-center"><Logo size={34} /><b className="font-display text-[22px] font-semibold tracking-[0.06em] text-indigo-800">VODMON Demo</b></div>
        <div className="mx-auto w-full max-w-sm pb-10 pt-[40vh] lg:my-auto lg:py-12">
          <h1 className="font-display text-4xl font-medium tracking-tight">{title}</h1>
          {subtitle && <p className="mt-2 text-slate-500">{subtitle}</p>}
          <div className="mt-6 h-1 w-12 rounded-full bg-gradient-to-r from-brass-400 via-coral-500 to-indigo-500" />
          <Card className="mt-8 p-6 shadow-[0_20px_50px_-20px_rgb(45_40_33/0.18)]">{children}</Card>
        </div>
        <p className="text-center text-xs text-slate-400">© {new Date().getFullYear()} VODMON Demo Examination Portal</p>
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
  dots: "M12 5h.01M12 12h.01M12 19h.01",
  trash: "M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3",
  key: "M15 7a4 4 0 11-3.9 4.9L4 19v-3h3v-2h2l2.1-2.1A4 4 0 0115 7z",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  ban: "M12 22a10 10 0 100-20 10 10 0 000 20zM5 5l14 14",
};
export function Icon({ name, className = "h-5 w-5" }: { name: keyof typeof PATHS | string; className?: string }) {
  return <svg aria-hidden="true" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" className={className}><path d={PATHS[name]} /></svg>;
}

// ---- app shell: sidebar on desktop; slim top bar + bottom tab bar on phone (like a mobile app) ----
type NavItem = { to: string; label: string; icon: string; end?: boolean };
const ADMIN_NAV: NavItem[] = [
  { to: "/admin", label: "Dashboard", icon: "home", end: true },
  { to: "/admin/students", label: "Students", icon: "students" },
  { to: "/admin/exams", label: "Exams", icon: "exams" },
  { to: "/admin/levels", label: "Levels", icon: "levels" },
  { to: "/admin/settings", label: "Settings", icon: "settings" },
];
const STUDENT_NAV: NavItem[] = [
  { to: "/", label: "My tests", icon: "exams", end: true },
  { to: "/results", label: "Progress", icon: "levels" },
  { to: "/change-password", label: "Settings", icon: "settings" },
];

function Shell({ nav, name, sub, initials, logoutTo, tag, children }: {
  nav: NavItem[]; name: string; sub: string; initials: string; logoutTo?: string; tag: string; children: ReactNode;
}) {
  const side = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 rounded-xl px-3.5 py-2.5 text-[15px] font-medium transition-colors ${isActive ? "bg-indigo-600 text-white shadow-sm" : "text-slate-600 hover:bg-indigo-50 hover:text-indigo-700"}`;
  return (
    <div className="min-h-screen md:flex">
      <aside className="hidden w-64 shrink-0 flex-col border-r border-slate-200 border-t-4 border-t-indigo-500 bg-white px-3 md:sticky md:top-0 md:flex md:h-screen">
        <div className="flex items-center gap-3 px-2 pb-6 pt-6">
          <Logo size={44} />
          <div className="leading-tight"><b className="font-display block text-xl font-medium text-slate-900">VODMON Demo</b><span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-indigo-600">{tag}</span></div>
        </div>
        <nav className="flex flex-col gap-1">
          {nav.map((n) => <NavLink key={n.to} to={n.to} end={n.end} className={side}><Icon name={n.icon} className="h-5 w-5" />{n.label}</NavLink>)}
        </nav>
        <div className="mb-4 mt-auto rounded-xl bg-slate-100 p-3">
          <div className="flex items-center gap-3">
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-indigo-600 text-sm font-bold text-white">{initials}</span>
            <div className="min-w-0 leading-tight"><b className="block truncate text-sm text-slate-900">{name}</b><span className="block truncate text-xs text-slate-500">{sub}</span></div>
          </div>
          <button onClick={() => logOut(logoutTo)} className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white py-2 text-sm font-medium text-slate-700 transition hover:bg-indigo-50 hover:text-indigo-700"><Icon name="logout" className="h-4 w-4" />Log out</button>
        </div>
      </aside>
      <div className="min-w-0 flex-1 pb-24 md:pb-0">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b-4 border-indigo-500 bg-white px-4 py-2.5 shadow-sm md:hidden">
          <b className="font-display flex items-center gap-2.5 text-lg font-medium text-slate-900"><Logo size={34} />VODMON Demo</b>
          <div className="flex items-center gap-1">
            <span className="grid h-9 w-9 place-items-center rounded-full bg-indigo-600 text-xs font-bold text-white">{initials}</span>
            <button aria-label="Log out" onClick={() => logOut(logoutTo)} className="p-2 text-slate-600"><Icon name="logout" /></button>
          </div>
        </header>
        {children}
      </div>
      <nav className="fixed inset-x-0 bottom-0 z-20 grid border-t border-slate-200 bg-white pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_16px_rgba(0,0,0,0.06)] md:hidden" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.end} className={({ isActive }) => `flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold ${isActive ? "text-indigo-700" : "text-slate-500"}`}>
            {({ isActive }) => <>
              <span className={`grid h-8 w-14 place-items-center rounded-full transition-colors ${isActive ? "bg-indigo-600/10" : ""}`}><Icon name={n.icon} className="h-6 w-6" /></span>
              <span className="truncate">{n.label}</span>
            </>}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}

export function AdminShell({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const email = session?.user.email ?? "";
  return <Shell nav={ADMIN_NAV} name="Admin" sub={email} initials="AD" logoutTo="/admin/login" tag="Admin panel">{children}</Shell>;
}

export function StudentShell({ children }: { children: ReactNode }) {
  const { student } = useAuth();
  const initials = (student?.full_name ?? "?").split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase();
  return <Shell nav={STUDENT_NAV} name={student?.full_name ?? ""} sub={`${student?.student_code ?? ""} · ${student ? levelName(student.level) : ""}`} initials={initials} tag="Student">{children}</Shell>;
}

// Blocking popup shown when this login was replaced by a newer login on another device.
export function SessionReplacedDialog() {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const on = () => setOpen(true);
    window.addEventListener(SESSION_REPLACED_EVENT, on);
    return () => window.removeEventListener(SESSION_REPLACED_EVENT, on);
  }, []);
  if (!open) return null;
  const leave = () => logOut();
  return (
    <div className="fixed inset-0 z-[60] grid place-items-center bg-slate-900/60 p-4 backdrop-blur-[2px]">
      <div role="alertdialog" aria-modal="true" aria-labelledby="replaced-title" className="w-full max-w-md rounded-2xl bg-white p-6 text-center shadow-2xl">
        <span className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-2xl bg-brass-400/25 text-brass-600"><Icon name="alert" className="h-7 w-7" /></span>
        <h2 id="replaced-title" className="font-display text-2xl font-medium text-slate-900">Logged in on another device</h2>
        <p className="mt-2 text-slate-600">You logged in on another device. Please log in again.</p>
        <Button autoFocus className="mt-6 flex w-full items-center justify-center gap-2" onClick={leave}><Icon name="logout" className="h-5 w-5" />Log out</Button>
      </div>
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

export const levelName = (n: number) => (n === 0 ? "Junior Level" : `Level ${n}`);
