import { twMerge } from "tailwind-merge";
import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode, SelectHTMLAttributes } from "react";

export function Button({ className, variant = "primary", ...props }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: "primary" | "secondary" | "danger" | "ghost" }) {
  const variants = { primary: "bg-brand-600 text-white hover:bg-brand-700", secondary: "border border-gray-300 bg-white text-gray-700 hover:bg-gray-50", danger: "bg-red-600 text-white hover:bg-red-700", ghost: "text-gray-600 hover:bg-gray-100" };
  return <button className={twMerge("focus-ring inline-flex items-center justify-center gap-2 rounded-lg px-3.5 py-2.5 text-sm font-semibold shadow-xs disabled:cursor-not-allowed disabled:opacity-50", variants[variant], className)} {...props} />;
}
export function Input(props: InputHTMLAttributes<HTMLInputElement>) { return <input {...props} className={twMerge("field", props.className)} />; }
export function Select(props: SelectHTMLAttributes<HTMLSelectElement>) { return <select {...props} className={twMerge("field", props.className)} />; }
export function Badge({ children, tone = "gray" }: { children: ReactNode; tone?: "gray" | "green" | "blue" | "amber" | "red" | "purple" }) {
  const colors = { gray: "bg-gray-100 text-gray-700", green: "bg-green-50 text-green-700 ring-green-600/20", blue: "bg-blue-50 text-blue-700 ring-blue-600/20", amber: "bg-amber-50 text-amber-700 ring-amber-600/20", red: "bg-red-50 text-red-700 ring-red-600/20", purple: "bg-brand-50 text-brand-700 ring-brand-600/20" };
  return <span className={twMerge("inline-flex rounded-full px-2.5 py-1 text-xs font-medium ring-1 ring-inset", colors[tone])}>{children}</span>;
}
export function Switch({ checked, onChange, label }: { checked: boolean; onChange: (checked: boolean) => void; label: string }) {
  return <label className="flex items-center justify-between gap-4"><span className="text-sm font-medium text-gray-700">{label}</span><button type="button" role="switch" aria-checked={checked} onClick={() => onChange(!checked)} className={twMerge("focus-ring relative h-6 w-11 rounded-full transition", checked ? "bg-brand-600" : "bg-gray-200")}><span className={twMerge("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition", checked ? "left-5.5" : "left-0.5")} /></button></label>;
}
export function Modal({ open, title, children, onClose }: { open: boolean; title: string; children: ReactNode; onClose: () => void }) {
  if (!open) return null;
  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-950/40 p-4" role="dialog" aria-modal="true"><div className="max-h-[90vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-xl"><div className="flex items-center justify-between border-b border-gray-200 px-6 py-4"><h2 className="text-lg font-semibold">{title}</h2><button className="rounded-md p-2 text-gray-500 hover:bg-gray-100" onClick={onClose} aria-label="Close">✕</button></div><div className="p-6">{children}</div></div></div>;
}
export function PageHeader({ title, description, action }: { title: string; description: string; action?: ReactNode }) { return <div className="mb-6 flex flex-col justify-between gap-4 sm:flex-row sm:items-center"><div><h1 className="text-2xl font-semibold tracking-tight text-gray-900">{title}</h1><p className="mt-1 text-sm text-gray-500">{description}</p></div>{action}</div>; }
export function Loading() { return <div className="card p-10 text-center text-sm text-gray-500">Loading performance data…</div>; }
export function Empty({ title, text }: { title: string; text: string }) { return <div className="card p-10 text-center"><div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-full bg-brand-50 text-brand-700">◇</div><h3 className="font-semibold">{title}</h3><p className="mt-1 text-sm text-gray-500">{text}</p></div>; }
export function ErrorState({ error }: { error: unknown }) { return <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error instanceof Error ? error.message : "Something went wrong"}</div>; }
