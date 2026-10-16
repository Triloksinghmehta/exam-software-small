// Small shared UI pieces. Big touch targets, plain words (roadmap.md UI rule).
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabase";

export function Button({ variant = "primary", className = "", ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" }) {
  const v = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-white text-blue-700 border-2 border-blue-600 hover:bg-blue-50",
    danger: "bg-white text-red-700 border-2 border-red-600 hover:bg-red-50",
  }[variant];
  return <button {...p} className={`rounded-xl px-4 py-3 text-base font-semibold disabled:opacity-50 ${v} ${className}`} />;
}

export function Field({ label, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string }) {
  return (
    <label className="block mb-4">
      <span className="block mb-1 font-medium">{label}</span>
      <input {...p} className="w-full rounded-lg border border-slate-300 bg-white px-3 py-3 text-lg focus:outline-2 focus:outline-blue-600" />
    </label>
  );
}

export const ErrorBox = ({ children }: { children: ReactNode }) =>
  children ? <p role="alert" className="mb-4 rounded-lg bg-red-50 p-3 text-red-800 border border-red-200">{children}</p> : null;

export const Card = ({ children, className = "" }: { children: ReactNode; className?: string }) =>
  <div className={`rounded-2xl bg-white p-5 shadow-sm ${className}`}>{children}</div>;

export function Page({ title, children, wide }: { title: string; children: ReactNode; wide?: boolean }) {
  return (
    <main className={`mx-auto px-4 py-6 ${wide ? "max-w-5xl" : "max-w-md"}`}>
      <h1 className="mb-5 text-2xl font-bold">{title}</h1>
      {children}
    </main>
  );
}

export function AdminBar() {
  const link = "px-3 py-2 rounded-lg hover:bg-slate-700";
  return (
    <nav className="bg-slate-900 text-white">
      <div className="mx-auto max-w-5xl flex flex-wrap items-center gap-1 px-4 py-2">
        <b className="mr-3">Abacus Admin</b>
        <Link className={link} to="/admin">Home</Link>
        <Link className={link} to="/admin/students">Students</Link>
        <Link className={link} to="/admin/exams">Exams</Link>
        <Link className={link} to="/admin/levels">Levels</Link>
        <Link className={link} to="/admin/settings">Settings</Link>
        <button className={`${link} ml-auto`} onClick={() => supabase.auth.signOut()}>Logout</button>
      </div>
    </nav>
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
