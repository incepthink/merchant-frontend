"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getRewardLabel } from "@/utils/rewardLabel";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession } from "@/utils/merchantSession";

type OrderWithDetails = {
  id: number;
  bill_amount?: string | number | null;
  status?: string;
  createdAt: string;
  selected_loyalty?: { value: number } | null;
  selected_reward?: {
    type: string;
    point_cost?: number;
    discountType?: string | null;
    discountValue?: string | number | null;
    productName?: string | null;
  } | null;
};

export default function MyOrdersTab() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<"generic" | null>(null);

  const fetchOrders = async () => {
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
      const response = await axiosInstance.get(
        `/user/merchant/orders/${selectedMerchantId}/${userId}`,
      );
      setOrders(response.data.data ?? []);
    } catch {
      setError("generic");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [merchantId]);

  if (loading) {
    return (
      <div className="p-4 space-y-3 font-quantico animate-pulse">
        {[...Array(4)].map((_, i) => (
          <div
            key={i}
            className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl h-16"
          />
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-3 text-center font-quantico min-h-50">
        <div className="text-4xl">⚠️</div>
        <p className="text-gray-400 text-sm">Failed to load orders.</p>
        <button
          onClick={fetchOrders}
          className="bg-[#2979FF] text-white px-5 py-2 rounded text-sm cursor-pointer hover:bg-[#1d5bbf] transition-colors"
        >
          Retry
        </button>
      </div>
    );
  }

  if (!orders.length) {
    return (
      <div className="p-4 flex flex-col items-center justify-center gap-2 text-center font-quantico min-h-50">
        <div className="text-4xl">🛒</div>
        <p className="text-white font-medium">No orders yet</p>
        <p className="text-gray-400 text-sm">
          Your order history will appear here.
        </p>
      </div>
    );
  }

  const statusColor: Record<string, string> = {
    accepted: "text-green-400",
    completed: "text-green-400",
    pending: "text-yellow-400",
    rejected: "text-red-400",
    processing: "text-blue-400",
  };

  return (
    <div className="p-4 space-y-3 font-quantico">
      {orders.map((order) => {
        const date = new Date(order.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
        });
        const status = order.status?.toLowerCase() ?? "";
        const colorClass =
          statusColor[status] ?? "text-gray-400";

        return (
          <div
            key={order.id}
            onClick={() => router.push(`/order/status/${order.id}`)}
            className="bg-[#0A0E2A] border border-[#2D3748] rounded-xl px-4 py-3 flex flex-col gap-3 cursor-pointer"
          >
            <p className="text-white text-sm font-medium">#{order.id}</p>
            <div className="flex flex-col gap-2">
              {order.selected_reward && (
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-sm">Reward</p>
                  <span className="text-white text-sm">
                    {getRewardLabel({
                      type: order.selected_reward.type,
                      discountType: order.selected_reward.discountType,
                      discountValue: order.selected_reward.discountValue?.toString(),
                      productName: order.selected_reward.productName,
                    })}
                  </span>
                </div>
              )}
              {order.selected_loyalty && (
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-sm">Points Gain</p>
                  <span className="text-green-400 text-sm">
                    +{order.selected_loyalty.value}
                  </span>
                </div>
              )}
              {order.selected_reward && (
                <div className="flex justify-between items-center">
                  <p className="text-gray-400 text-sm">Points Spent</p>
                  <span className="text-red-400 text-sm">
                    {order.selected_reward.point_cost}
                  </span>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-4 border-t border-[#2D3748] pt-2">
              <p className={`text-xs capitalize font-medium ${colorClass}`}>
                {order.status}
              </p>
              <p className="text-gray-500 text-xs">{date}</p>
            </div>
          </div>
        );
      })}
    </div>
  );
}
