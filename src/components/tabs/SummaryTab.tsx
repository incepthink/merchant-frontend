"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession } from "@/utils/merchantSession";

type MerchantTier = {
  name: string;
  minValue: number;
};

type MerchantSummary = {
  balance: number;
  tier_points: number;
  enrolled_at: string;
  total_points_earned: number;
  total_points_spent: number;
  current_tier?: MerchantTier | null;
  points_until_next_tier?: number | null;
};

export default function SummaryTab() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const [data, setData] = useState<MerchantSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"not_enrolled" | "generic" | null>(null);
  const [currentStreak, setCurrentStreak] = useState(0);

  const fetchPoints = async () => {
    const user = getMerchantSession();
    const userId = user?.id;
    const selectedMerchantId = merchantId ?? user?.merchant_id;

    if (!userId || !selectedMerchantId) {
      router.push("/login");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await axiosInstance.get("/user/merchant/points", {
        params: { user_id: userId, merchant_id: selectedMerchantId },
      });
      setData(response.data.data);

      const streakResponse = await axiosInstance.post(
        "/user/merchant/extend-streak",
        null,
        {
          params: { user_id: userId, merchant_id: selectedMerchantId },
        },
      );
      setCurrentStreak(streakResponse.data.user_achievements.current_streak);
    } catch (err: unknown) {
      const status =
        (err as { response?: { status?: number }; status?: number })?.response
          ?.status ?? (err as { status?: number })?.status;
      if (status === 404) {
        setError("not_enrolled");
      } else {
        setError("generic");
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPoints();
  }, [merchantId]);
  if (loading) {
    return (
      <div className="p-4 space-y-4 font-quantico animate-pulse">
        <div className="h-6 w-40 bg-[#1C1F2D] rounded" />
        <div className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl p-5 h-28" />
        <div className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl p-5 h-16" />
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl p-5 h-24" />
          <div className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl p-5 h-24" />
        </div>
        <div className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl p-5 h-16" />
      </div>
    );
  }

  if (error === "not_enrolled") {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-3 text-center font-quantico min-h-[200px]">
        <div className="text-4xl">🎯</div>
        <h3 className="text-lg font-semibold text-white">Not Enrolled</h3>
        <p className="text-gray-400 text-sm max-w-xs">
          You are not enrolled in any loyalty program for this merchant yet.
        </p>
      </div>
    );
  }

  if (error === "generic") {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-3 text-center font-quantico min-h-[200px]">
        <div className="text-4xl">⚠️</div>
        <h3 className="text-lg font-semibold text-white">
          Something went wrong
        </h3>
        <p className="text-gray-400 text-sm mb-2">
          Failed to load your loyalty summary.
        </p>
        <button
          onClick={fetchPoints}
          className="bg-[#2979FF] text-white px-5 py-2 rounded text-sm cursor-pointer hover:bg-[#1d5bbf] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!data) return null;

  const enrolledDate = new Date(data.enrolled_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="p-4 space-y-6 font-quantico">
      {/* Balance — hero card */}
      <div>
        <p className="text-[#2979FF] text-xl font-bold text-center mb-4">
          STREAK: {currentStreak} DAY
        </p>
        <div className="flex items-end justify-between mb-6">
          <div className="flex items-end gap-2">
            <p className="text-[#2979FF] text-7xl font-bold">
              {data.balance?.toLocaleString()}
            </p>
            <p className="text-[#2979FF] text-lg font-semibold text-center">
              Points
            </p>
          </div>
          {data.current_tier && (
            <div>
              <div>
                <div>
                  <p className="text-white text-4xl font-semibold capitalize">
                    {data.current_tier.name.toLocaleUpperCase()} TIER
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
        {/* Tier progress bar */}
        {data.current_tier &&
          (() => {
            const pct =
              data.points_until_next_tier === null
                ? 100
                : Math.min(
                    100,
                    ((data.balance - data.current_tier.minValue) /
                      (data.balance -
                        data.current_tier.minValue +
                        (data.points_until_next_tier ?? 0))) *
                      100,
                  );
            return (
              <div className="mt-2 w-full">
                <div className="w-full bg-[#1C1F2D] rounded-full h-2">
                  <div
                    className="progress-gradient h-2 rounded-full"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <p className="text-white text-lg mt-2 text-right">
                  {data.points_until_next_tier === null
                    ? "Max Tier"
                    : `${data.points_until_next_tier?.toLocaleString()} points to next tier`}
                </p>
              </div>
            );
          })()}
      </div>

      {/* Current Tier */}

      {/* Earned, Spent, member */}
      <div className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
          <p className="text-gray-400 text-sm">Total Points Earned</p>
          <p className="text-white text-lg font-bold">
            {data.total_points_earned.toLocaleString()}
          </p>
        </div>
        <div className="flex justify-between items-center px-5 py-4 border-b border-white/10">
          <p className="text-gray-400 text-sm">Total Points Spent</p>
          <p className="text-white text-lg font-bold">
            {data.total_points_spent.toLocaleString()}
          </p>
        </div>
        <div className="flex justify-between items-center px-5 py-4">
          <p className="text-gray-400 text-sm">Member Since</p>
          <p className="text-white text-lg font-bold">{enrolledDate}</p>
        </div>
      </div>
    </div>
  );
}
