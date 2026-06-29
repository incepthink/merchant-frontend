"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Gift, Lock, Sparkles, Tag } from "lucide-react";
import { getRewardLabel } from "@/utils/rewardLabel";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession } from "@/utils/merchantSession";
import { EmptyState, ErrorState, SkeletonSurface, StatusBadge } from "@/components/customer/Primitives";

type Reward = { id: number; type: string; point_cost?: number; discountType?: string | null; discountValue?: string | number | null; productName?: string | null; can_claim?: boolean; required_tier?: { name?: string } | null };

export default function ActivityTab() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const [rewards, setRewards] = useState<{ claimed: Reward[]; pending: Reward[] }>({ claimed: [], pending: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchRewards = async () => {
    const user = getMerchantSession();
    const selectedMerchantId = merchantId ?? user?.merchant_id;
    if (!user?.id || !selectedMerchantId) { router.push("/login"); return; }
    setLoading(true);
    setError(false);
    try {
      const [claimedResponse, pendingResponse] = await Promise.all([
        axiosInstance.get("/user/merchant/granted-rewards", { params: { user_id: user.id, merchant_id: selectedMerchantId } }),
        axiosInstance.get("/user/merchant/rewards", { params: { user_id: user.id, merchant_id: selectedMerchantId } }),
      ]);
      setRewards({ claimed: claimedResponse.data.data ?? [], pending: pendingResponse.data.data ?? [] });
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRewards(); }, [merchantId]);

  return (
    <div>
      <header className="mb-6"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Rewards</h1><p className="mt-1 text-sm text-text-secondary">Your available and claimed loyalty rewards.</p></header>
      {loading && <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{Array.from({ length: 6 }).map((_, index) => <SkeletonSurface key={index} className="h-64" />)}</div>}
      {!loading && error && <ErrorState title="Rewards unavailable" description="Failed to load your rewards." onRetry={fetchRewards} />}
      {!loading && !error && rewards.claimed.length === 0 && rewards.pending.length === 0 && <EmptyState icon={Sparkles} title="No rewards available yet" description="Your rewards will appear here when they become available." />}
      {!loading && !error && (rewards.pending.length > 0 || rewards.claimed.length > 0) && <>{rewards.pending.length > 0 && <RewardSection title="Available"><div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">{rewards.pending.map((reward) => <RewardCard key={reward.id} reward={reward} />)}</div></RewardSection>}{rewards.claimed.length > 0 && <RewardSection title="Claimed"><div className="grid min-w-0 gap-4 sm:grid-cols-2 lg:grid-cols-3">{rewards.claimed.map((reward) => <RewardCard key={reward.id} reward={reward} claimed />)}</div></RewardSection>}</>}
    </div>
  );
}

function RewardSection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-8 first:mt-0"><h2 className="mb-3 text-sm font-medium uppercase tracking-[0.16em] text-text-muted">{title}</h2>{children}</section>;
}

function RewardCard({ reward, claimed = false }: { reward: Reward; claimed?: boolean }) {
  const locked = reward.can_claim === false && !claimed;
  const Icon = reward.type.includes("FREE") ? Gift : reward.type.includes("BOGO") ? Sparkles : Tag;
  const label = getRewardLabel({ ...reward, discountValue: reward.discountValue?.toString() });
  return (
    <article className={`min-w-0 max-w-full rounded-3xl border border-border-subtle bg-surface-1 p-4 transition-colors ${locked ? "opacity-70" : ""}`}>
      <div className="flex h-full min-w-0 flex-col">
        <div className="relative grid h-32 w-full min-w-0 place-items-center overflow-hidden rounded-2xl" style={{ backgroundImage: locked ? "linear-gradient(135deg, #1d1a2b, #2a2640)" : "var(--gradient-card)" }} aria-hidden><Icon className={`size-9 ${locked ? "text-text-muted" : "text-white"}`} />{locked && <div className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-white/80"><Lock className="size-3" />Locked</div>}</div>
        <div className="mt-4 min-w-0 flex-1"><div className="flex min-w-0 items-start justify-between gap-2"><h3 className="min-w-0 flex-1 truncate text-[15px] font-medium text-text-primary">{reward.productName ?? label}</h3><span className="shrink-0"><StatusBadge status={claimed ? "claimed" : locked ? "unavailable" : "available"} /></span></div><p className="mt-1 line-clamp-2 break-words text-sm text-text-secondary">{label}</p><div className="mt-3 flex min-w-0 flex-wrap items-center gap-3 text-xs text-text-muted">{reward.point_cost != null && <span className="tnum">{reward.point_cost.toLocaleString()} pts</span>}{reward.required_tier?.name && <span>· {reward.required_tier.name} tier</span>}</div></div>
      </div>
    </article>
  );
}
