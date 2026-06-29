"use client";

import type { ReactNode } from "react";
import { Home, LogOut, Receipt, Sparkles, User, type LucideIcon } from "lucide-react";
import MerchantDropdown from "@/components/MerchantDropdown";

export type CustomerTab = "summary" | "my-orders" | "activity" | "profile";
type NavItem = { label: string; value: CustomerTab; icon: LucideIcon };
const NAV: NavItem[] = [
  { label: "Home", value: "summary", icon: Home },
  { label: "Orders", value: "my-orders", icon: Receipt },
  { label: "Rewards", value: "activity", icon: Sparkles },
  { label: "Profile", value: "profile", icon: User },
];

export function HashcaseWordmark({ className = "" }: { className?: string }) {
  return <span className={`font-semibold tracking-[-0.02em] text-text-primary ${className}`} aria-label="Hashcase"><span className="mr-2 inline-block size-2 rounded-full gradient-primary align-middle" />Hashcase</span>;
}

export function CustomerAppShell({ activeTab, merchantId, onMerchantChange, onTabChange, onLogout, children }: { activeTab: CustomerTab; merchantId: number | null; onMerchantChange: (id: number) => void; onTabChange: (tab: CustomerTab) => void; onLogout: () => void; children: ReactNode }) {
  return (
    <div className="relative min-h-dvh bg-background text-text-primary">
      <div aria-hidden className="pointer-events-none fixed inset-x-0 top-0 -z-0 h-[520px] opacity-60" style={{ background: "radial-gradient(60% 50% at 20% 0%, rgba(81,70,229,0.18), transparent 70%), radial-gradient(50% 40% at 90% 10%, rgba(233,103,129,0.14), transparent 70%)" }} />
      <header className="sticky top-0 z-30 border-b border-border-subtle bg-background/95">
        <div className="mx-auto grid max-w-[1180px] grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 px-4 py-3 sm:px-6 sm:py-4">
          <button type="button" onClick={() => onTabChange("summary")} className="flex items-center" aria-label="Hashcase home"><HashcaseWordmark className="text-lg" /></button>
          <div className="min-w-0 justify-self-center sm:justify-self-start sm:pl-4"><MerchantDropdown value={merchantId ?? ""} onChange={(id) => { if (id !== "") onMerchantChange(id); }} /></div>
          <nav className="hidden items-center gap-1 md:flex" aria-label="Primary">
            {NAV.map((item) => <button key={item.value} type="button" onClick={() => onTabChange(item.value)} aria-current={activeTab === item.value ? "page" : undefined} className={`group flex h-11 items-center gap-2 rounded-full px-4 text-sm transition-colors duration-200 ease-out ${activeTab === item.value ? "bg-surface-2 text-text-primary" : "text-text-secondary hover:bg-surface-1 hover:text-text-primary"}`}><item.icon className="size-4" aria-hidden />{item.label}</button>)}
            <button type="button" onClick={onLogout} aria-label="Sign out" className="ml-2 inline-flex size-11 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-1 hover:text-text-primary"><LogOut className="size-4" aria-hidden /></button>
          </nav>
          <div className="md:hidden" aria-hidden />
        </div>
      </header>
      <main className="relative z-10 mx-auto w-full max-w-[1180px] px-4 pb-28 pt-6 sm:px-6 sm:pt-8 md:pb-12">{children}</main>
      <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-30 border-t border-border-subtle bg-background/95 md:hidden" style={{ paddingBottom: "env(safe-area-inset-bottom)" }}>
        <ul className="mx-auto flex max-w-[640px] items-stretch justify-around px-2 pt-1.5">
          {NAV.map((item) => <li key={item.value} className="flex-1"><button type="button" onClick={() => onTabChange(item.value)} aria-current={activeTab === item.value ? "page" : undefined} className={`mx-auto flex h-14 min-w-11 flex-col items-center justify-center gap-1 rounded-2xl px-3 text-[11px] transition-colors duration-200 ease-out ${activeTab === item.value ? "text-text-primary" : "text-text-muted"}`}><span className={`grid size-9 place-items-center rounded-xl transition-colors ${activeTab === item.value ? "surface-raised" : ""}`}><item.icon className="size-5" aria-hidden /></span><span className="leading-none">{item.label}</span></button></li>)}
        </ul>
      </nav>
    </div>
  );
}
