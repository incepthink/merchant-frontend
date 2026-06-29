"use client";

import { Flame, Wifi } from "lucide-react";

export type LiveMembership = {
  balance: number;
  tier_points: number;
  currentStreak: number;
  current_tier?: { name: string } | null;
  next_tier?: { name: string } | null;
  points_until_next_tier?: number | null;
};

const fmtPoints = (value: number) => value.toLocaleString();

function TierProgress({ membership }: { membership: LiveMembership }) {
  const pointsUntilNext = membership.points_until_next_tier ?? null;
  const isMax = pointsUntilNext === null;
  const pct = isMax
    ? 100
    : pointsUntilNext + membership.tier_points > 0
      ? Math.max(4, Math.min(100, Math.round((membership.tier_points / (membership.tier_points + pointsUntilNext)) * 100)))
      : 0;
  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-3 text-[11px] uppercase tracking-[0.14em] text-white/70">
        <span>{membership.current_tier?.name ?? "Unranked"}</span>
        <span>{isMax ? "Top tier" : "Next tier"}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Tier progression">
        <div className="h-full rounded-full bg-white/95 transition-[width] duration-300 ease-out" style={{ width: `${pct}%` }} />
      </div>
      <div className="text-xs text-white/80 tnum">
        {isMax ? "Highest tier reached" : `${fmtPoints(pointsUntilNext)} points until the next tier`}
      </div>
    </div>
  );
}

export function MembershipCard({ merchantName, customerName, membership }: { merchantName: string; customerName?: string; membership: LiveMembership }) {
  const tier = membership.current_tier?.name ?? "Member";
  return (
    <article className="relative isolate overflow-hidden rounded-[32px] p-6 text-white shadow-[var(--shadow-card)] sm:p-8" style={{ backgroundImage: "var(--gradient-card)" }} aria-label={`${merchantName} membership card`}>
      <div aria-hidden className="pointer-events-none absolute -right-24 -top-24 size-72 rounded-full opacity-40 blur-3xl" style={{ background: "radial-gradient(circle, rgba(255,255,255,0.6), transparent 60%)" }} />
      <div aria-hidden className="pointer-events-none absolute -left-16 bottom-0 h-48 w-48 rounded-full opacity-30 blur-3xl" style={{ background: "radial-gradient(circle, rgba(233,103,129,0.9), transparent 65%)" }} />
      <header className="relative flex items-start justify-between gap-4">
        <div className="min-w-0"><div className="text-[11px] uppercase tracking-[0.22em] text-white/70">hashcase</div><h2 className="mt-1 truncate text-lg font-medium tracking-tight text-white sm:text-xl">{merchantName}</h2></div>
        <Wifi className="size-5 rotate-90 text-white/80" aria-hidden />
      </header>
      <div className="relative mt-10 sm:mt-14"><div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Available balance</div><div className="mt-1 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight tnum sm:text-5xl">{fmtPoints(membership.balance)}</span><span className="text-sm text-white/70">pts</span></div></div>
      <div className="relative mt-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-4"><div className="min-w-0"><div className="text-[11px] uppercase tracking-[0.18em] text-white/70">Member</div><div className="mt-1 truncate text-base font-medium">{customerName ?? "Member"}</div></div><div className="rounded-full bg-white/15 px-3 py-1 text-xs font-medium tracking-wide text-white">{tier}</div></div>
      <div className="relative mt-6 border-t border-white/20 pt-5"><TierProgress membership={membership} /></div>
      <div className="relative mt-5 inline-flex items-center gap-1.5 rounded-full bg-black/25 px-3 py-1.5 text-xs"><Flame className="size-3.5 text-white" aria-hidden /><span className="tnum">{membership.currentStreak}-visit streak</span></div>
    </article>
  );
}

export function MembershipCardSkeleton() {
  return <div aria-busy aria-label="Loading membership" className="h-[360px] animate-pulse rounded-[32px] surface-2" />;
}
