"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession, type MerchantSession } from "@/utils/merchantSession";

type ProfileSummary = {
  balance: number;
  tier_points: number;
  enrolled_at: string;
  total_points_earned: number;
  total_points_spent: number;
  current_tier?: { name: string } | null;
};

export default function ProfileTab() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const [user, setUser] = useState<MerchantSession | null>(null);
  const [summary, setSummary] = useState<ProfileSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchProfile = async () => {
    const session = getMerchantSession();
    const selectedMerchantId = merchantId ?? session?.merchant_id;
    if (!session || !selectedMerchantId) {
      router.push("/login");
      return;
    }

    setUser({ ...session, merchant_id: selectedMerchantId });
    setLoading(true);
    setError(false);

    try {
      const response = await axiosInstance.get("/user/merchant/points", {
        params: { user_id: session.id, merchant_id: selectedMerchantId },
      });
      setSummary(response.data.data);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProfile();
  }, [merchantId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3 animate-pulse">
        <div className="h-6 w-32 rounded bg-[#1C1F2D]" />
        <div className="h-28 rounded-xl border border-[#2D3748] bg-[#0A0E2A]" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="p-4 flex min-h-50 flex-col items-center justify-center gap-3 text-center">
        <p className="text-sm text-gray-400">Failed to load profile.</p>
        <button
          onClick={fetchProfile}
          className="rounded bg-[#2979FF] px-5 py-2 text-sm text-white transition-colors hover:bg-[#1d5bbf]"
        >
          Retry
        </button>
      </div>
    );
  }

  const enrolledDate = summary?.enrolled_at
    ? new Date(summary.enrolled_at).toLocaleDateString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
      })
    : "Not enrolled";

  return (
    <div className="p-4 space-y-4">
      <h2 className="text-xl font-semibold mb-2">Profile</h2>
      <div className="rounded-xl border border-[#2D3748] bg-[#0A0E2A] p-4 space-y-3">
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Name</p>
          <p className="text-white">{user.name ?? "Customer"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Email</p>
          <p className="text-white">{user.email ?? "-"}</p>
        </div>
        <div>
          <p className="text-xs uppercase tracking-wide text-gray-500">Phone</p>
          <p className="text-white">{user.phone ?? "-"}</p>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-xl border border-[#2D3748] bg-[#0A0E2A] p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Points</p>
          <p className="text-2xl font-semibold text-[#2979FF]">
            {summary?.balance?.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-[#2D3748] bg-[#0A0E2A] p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Tier</p>
          <p className="text-2xl font-semibold text-white">
            {summary?.current_tier?.name ?? "No tier"}
          </p>
        </div>
        <div className="rounded-xl border border-[#2D3748] bg-[#0A0E2A] p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Earned</p>
          <p className="text-lg font-semibold text-white">
            {summary?.total_points_earned?.toLocaleString() ?? 0}
          </p>
        </div>
        <div className="rounded-xl border border-[#2D3748] bg-[#0A0E2A] p-4">
          <p className="text-xs uppercase tracking-wide text-gray-500">Member Since</p>
          <p className="text-lg font-semibold text-white">{enrolledDate}</p>
        </div>
      </div>
    </div>
  );
}
