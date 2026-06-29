"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ShoppingBag, Sparkles, TrendingUp } from "lucide-react";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession } from "@/utils/merchantSession";
import { MembershipCard, MembershipCardSkeleton } from "@/components/customer/MembershipCard";
import { EmptyState, ErrorState, LuxurySurface, PrimaryAction, SkeletonSurface } from "@/components/customer/Primitives";

type MerchantSummary = {
  balance: number;
  tier_points: number;
  enrolled_at: string;
  total_points_earned: number;
  total_points_spent: number;
  current_tier?: { name: string; minValue: number } | null;
  points_until_next_tier?: number | null;
};

export default function SummaryTab() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const merchantList = useMerchantStore((state) => state.merchantList);
  const [data, setData] = useState<MerchantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_enrolled" | "generic" | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  const fetchPoints = async () => {
    const user = getMerchantSession();
    const selectedMerchantId = merchantId ?? user?.merchant_id;
    if (!user?.id || !selectedMerchantId) { router.push("/login"); return; }
    setLoading(true);
    setError(null);
    try {
      const response = await axiosInstance.get("/user/merchant/points", { params: { user_id: user.id, merchant_id: selectedMerchantId } });
      setData(response.data.data);
      const streakResponse = await axiosInstance.post("/user/merchant/extend-streak", null, { params: { user_id: user.id, merchant_id: selectedMerchantId } });
      setCurrentStreak(streakResponse.data.user_achievements.current_streak);
    } catch (err: unknown) {
      const status = (err as { response?: { status?: number }; status?: number })?.response?.status ?? (err as { status?: number })?.status;
      setError(status === 404 ? "not_enrolled" : "generic");
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchPoints(); }, [merchantId]);

  if (loading) {
    return <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]"><MembershipCardSkeleton /><SkeletonSurface className="h-[360px]" /></div>;
  }
  if (error === "not_enrolled") {
    const merchantName = merchantList.find((merchant) => merchant.id === merchantId)?.name ?? "this merchant";
    return <EmptyState icon={Sparkles} title="Not enrolled at this merchant" description={`You are not enrolled in ${merchantName}'s loyalty program.`} />;
  }
  if (error === "generic" || !data) return <ErrorState title="Membership unavailable" description="We couldn't load your loyalty summary." onRetry={fetchPoints} />;

  const user = getMerchantSession();
  const merchantName = merchantList.find((merchant) => merchant.id === merchantId)?.name ?? "Merchant";
  const enrolledDate = new Date(data.enrolled_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });

  return (
    <div className="grid gap-6 md:grid-cols-[minmax(0,1.05fr)_minmax(0,1fr)]">
      <div>
        <MembershipCard merchantName={merchantName} customerName={user?.name} membership={{ balance: data.balance, tier_points: data.tier_points, currentStreak, current_tier: data.current_tier, points_until_next_tier: data.points_until_next_tier }} />
        <div className="mt-5 flex flex-wrap gap-3">
          <PrimaryAction fullWidth className="h-14 text-base" onClick={() => router.push("/order")}>Checkout</PrimaryAction>
          <PrimaryAction variant="secondary" onClick={() => router.push("?tab=activity")}><Sparkles className="size-4" aria-hidden />Browse rewards</PrimaryAction>
        </div>
      </div>
      <LuxurySurface className="space-y-5">
        <header className="flex items-center justify-between"><h2 className="text-base font-medium">Membership details</h2></header>
        <dl className="grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border-subtle">
          <Stat label="Total earned" value={`${data.total_points_earned.toLocaleString()} pts`} icon={TrendingUp} />
          <Stat label="Total spent" value={`${data.total_points_spent.toLocaleString()} pts`} icon={ShoppingBag} />
        </dl>
        <div className="rounded-2xl surface-2 px-4 py-3 text-sm"><div className="text-xs uppercase tracking-[0.12em] text-text-muted">Member since</div><div className="mt-0.5 text-text-primary tnum">{enrolledDate}</div></div>
      </LuxurySurface>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: React.ComponentType<{ className?: string }> }) {
  return <div className="surface-1 p-4"><div className="flex items-center gap-2 text-xs uppercase tracking-[0.12em] text-text-muted"><Icon className="size-3.5" />{label}</div><div className="mt-1.5 text-lg font-medium text-text-primary tnum">{value}</div></div>;
}
