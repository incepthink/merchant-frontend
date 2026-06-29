import Link from "next/link";
import type { ReactNode } from "react";
import { HashcaseWordmark } from "./AppShell";

export function AuthLayout({ title, subtitle, children, footer }: { title: string; subtitle: string; children: ReactNode; footer?: ReactNode }) {
  return (
    <div className="relative grid min-h-dvh grid-cols-1 lg:grid-cols-2">
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10 opacity-70" style={{ background: "radial-gradient(50% 40% at 25% 20%, rgba(81,70,229,0.22), transparent 70%), radial-gradient(45% 40% at 80% 80%, rgba(233,103,129,0.18), transparent 70%)" }} />
      <aside className="relative hidden flex-col justify-between border-r border-border-subtle bg-surface-1 p-10 lg:flex">
        <Link href="/" aria-label="Hashcase home"><HashcaseWordmark className="text-lg" /></Link>
        <div className="space-y-4"><h2 className="max-w-md text-3xl font-medium tracking-tight text-text-primary">Your Hashcase loyalty membership.</h2></div>
        <div className="h-1 w-24 rounded-full gradient-primary" aria-hidden />
      </aside>
      <section className="flex items-center justify-center p-6 sm:p-10"><div className="w-full max-w-md"><div className="mb-8 lg:hidden"><HashcaseWordmark className="text-lg" /></div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">{title}</h1><p className="mt-2 text-sm text-text-secondary">{subtitle}</p><div className="mt-8">{children}</div>{footer && <div className="mt-6">{footer}</div>}</div></section>
    </div>
  );
}
