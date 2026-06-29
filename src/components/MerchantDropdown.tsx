"use client";

import { useEffect, useId, useRef, useState } from "react";
import { Check, ChevronDown, Search, Store } from "lucide-react";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";

interface Merchant {
  id: number;
  name: string;
  status: string;
}

export default function MerchantDropdown({ value, onChange }: { value: number | ""; onChange: (id: number | "") => void }) {
  const [merchants, setMerchants] = useState<Merchant[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const setMerchantList = useMerchantStore((state) => state.setMerchantList);
  const btnRef = useRef<HTMLButtonElement>(null);
  const popRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();

  useEffect(() => {
    axiosInstance.get("/platform/merchant")
      .then((res) => {
        const active = (res.data.data as Merchant[]).filter((merchant) => merchant.status === "active").reverse();
        setMerchants(active);
        setMerchantList(active);
        if (active.length > 0 && (!value || !active.some((merchant) => merchant.id === value))) onChange(active[0].id);
      })
      .catch(() => { setMerchants([]); setMerchantList([]); })
      .finally(() => setLoading(false));
  }, []);

  const filtered = merchants.filter((merchant) => merchant.name.toLowerCase().includes(search.toLowerCase()));
  const selected = merchants.find((merchant) => merchant.id === value) ?? null;

  useEffect(() => {
    if (!open) return;
    const onDocumentClick = (event: MouseEvent) => {
      if (!popRef.current?.contains(event.target as Node) && !btnRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDocumentClick);
    return () => document.removeEventListener("mousedown", onDocumentClick);
  }, [open]);

  useEffect(() => {
    if (open) {
      setSearch("");
      setActiveIdx(0);
      window.setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  const choose = (id: number) => {
    onChange(id);
    setOpen(false);
    btnRef.current?.focus();
  };

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (!open && (event.key === "Enter" || event.key === " " || event.key === "ArrowDown")) {
      event.preventDefault();
      setOpen(true);
      return;
    }
    if (!open) return;
    if (event.key === "Escape") { setOpen(false); btnRef.current?.focus(); }
    else if (event.key === "ArrowDown") { event.preventDefault(); setActiveIdx((index) => Math.min(index + 1, filtered.length - 1)); }
    else if (event.key === "ArrowUp") { event.preventDefault(); setActiveIdx((index) => Math.max(index - 1, 0)); }
    else if (event.key === "Enter") { event.preventDefault(); const merchant = filtered[activeIdx]; if (merchant) choose(merchant.id); }
  };

  return (
    <div className="relative inline-block w-full max-w-xs" onKeyDown={handleKeyDown}>
      <button ref={btnRef} type="button" aria-haspopup="listbox" aria-expanded={open} aria-controls={listboxId} aria-label={selected ? `Active merchant: ${selected.name}` : "Select merchant"} onClick={() => !loading && setOpen((current) => !current)} className="group flex h-11 w-full min-w-0 items-center gap-2.5 rounded-2xl border border-border-subtle bg-surface-1 px-3 text-left text-sm text-text-primary transition-colors hover:border-border-strong disabled:opacity-60" disabled={loading}>
        <span className="grid size-7 shrink-0 place-items-center rounded-lg gradient-card text-white"><Store className="size-3.5" aria-hidden /></span>
        <span className="min-w-0 flex-1"><span className="block text-[10px] uppercase tracking-[0.14em] text-text-muted">Membership at</span><span className="block truncate font-medium leading-tight">{loading ? "Loading…" : selected?.name ?? "Select merchant"}</span></span>
        <ChevronDown className={`size-4 shrink-0 text-text-muted transition-transform duration-200 ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div ref={popRef} className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 overflow-hidden rounded-2xl border border-border-subtle bg-surface-2 shadow-[0_24px_48px_-16px_rgba(0,0,0,0.7)]" role="dialog">
          <div className="flex items-center gap-2 border-b border-border-subtle px-3 py-2.5"><Search className="size-4 text-text-muted" aria-hidden /><input ref={inputRef} type="text" value={search} onChange={(event) => { setSearch(event.target.value); setActiveIdx(0); }} placeholder="Search merchants" aria-label="Search merchants" className="h-9 min-w-0 flex-1 bg-transparent text-sm text-text-primary outline-none placeholder:text-text-muted" /></div>
          <ul id={listboxId} role="listbox" aria-label="Merchants" className="max-h-72 overflow-y-auto py-1.5">
            {filtered.length === 0 && <li className="px-4 py-6 text-center text-sm text-text-muted">{merchants.length === 0 ? "No merchants available" : "No matches"}</li>}
            {filtered.map((merchant, index) => {
              const isSelected = merchant.id === value;
              const isActive = index === activeIdx;
              return <li key={merchant.id} role="option" aria-selected={isSelected}><button type="button" onMouseEnter={() => setActiveIdx(index)} onClick={() => choose(merchant.id)} className={`flex min-h-11 w-full items-center gap-3 px-3 text-left text-sm transition-colors ${isActive ? "surface-3" : ""} ${isSelected ? "text-text-primary" : "text-text-secondary"}`}><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-surface-raised text-text-primary"><Store className="size-3.5" aria-hidden /></span><span className="min-w-0 flex-1 truncate">{merchant.name}</span>{isSelected && <Check className="size-4 shrink-0 text-accent-coral" aria-hidden />}</button></li>;
            })}
          </ul>
        </div>
      )}
    </div>
  );
}
