"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronRight, Receipt, Sparkles, Tag, Ticket } from "lucide-react";
import { getRewardLabel } from "@/utils/rewardLabel";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession } from "@/utils/merchantSession";
import { EmptyState, ErrorState, SkeletonSurface, StatusBadge } from "@/components/customer/Primitives";

type Reward = { type: string; point_cost?: number; discountType?: string | null; discountValue?: string | number | null; productName?: string | null };
type OrderWithDetails = {
  id: number;
  bill_amount?: string | number | null;
  status?: string;
  createdAt: string;
  payment_method?: { type?: string | null; card_type?: string | null; network?: string | null; linked_bank?: string | null; last_four?: string | null; upi_handle?: string | null } | null;
  loyalty?: { code?: string | null; value: number } | null;
  reward?: Reward | null;
  selected_loyalty?: { code?: string | null; value: number } | null;
  selected_reward?: Reward | null;
};

function formatAmount(amount: OrderWithDetails["bill_amount"]) {
  const value = Number(amount);
  return Number.isFinite(value) ? `₹${value.toFixed(2)}` : "Amount not set";
}

function formatPaymentMethod(paymentMethod: OrderWithDetails["payment_method"]) {
  if (!paymentMethod) return "Payment method not set";
  if (paymentMethod.last_four) {
    const network = paymentMethod.network?.toUpperCase() ?? paymentMethod.type?.toUpperCase() ?? "CARD";
    return `${network} **********${paymentMethod.last_four}`;
  }
  if (paymentMethod.type === "upi") return paymentMethod.upi_handle ? `UPI ••••@${paymentMethod.upi_handle}` : "UPI";
  return paymentMethod.type?.toUpperCase() ?? "Payment method not set";
}

export default function MyOrdersTab() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const [orders, setOrders] = useState<OrderWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const fetchOrders = async () => {
    const user = getMerchantSession();
    const selectedMerchantId = merchantId ?? user?.merchant_id;
    if (!user?.id || !selectedMerchantId) { router.push("/login"); return; }
    setLoading(true);
    setError(false);
    try {
      const response = await axiosInstance.get(`/user/merchant/orders/${selectedMerchantId}/${user.id}`);
      setOrders(response.data.data ?? []);
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchOrders(); }, [merchantId]);

  return (
    <div>
      <header className="mb-6 flex items-end justify-between gap-3"><div><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Orders</h1><p className="mt-1 text-sm text-text-secondary">Your order history and applied loyalty benefits.</p></div></header>
      {loading && <div className="space-y-3">{Array.from({ length: 3 }).map((_, index) => <SkeletonSurface key={index} className="h-32" />)}</div>}
      {!loading && error && <ErrorState title="Orders unavailable" description="Failed to load your orders." onRetry={fetchOrders} />}
      {!loading && !error && orders.length === 0 && <EmptyState icon={Receipt} title="No orders yet" description="Your order history will appear here after checkout." />}
      {!loading && !error && orders.length > 0 && (
        <ul className="space-y-3">
          {orders.map((order) => {
            const reward = order.selected_reward ?? order.reward ?? null;
            const loyalty = order.selected_loyalty ?? order.loyalty ?? null;
            const rewardText = reward ? getRewardLabel({ ...reward, discountValue: reward.discountValue?.toString() }) : null;
            return (
              <li key={order.id}>
                <button type="button" onClick={() => router.push(`/order/status/${order.id}`)} className="group block w-full rounded-3xl border border-border-subtle bg-surface-1 p-5 text-left transition-colors hover:border-border-strong">
                  <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-4">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2 text-xs text-text-muted"><Ticket className="size-3.5" aria-hidden /><span className="truncate">#{order.id}</span><span aria-hidden>·</span><span className="truncate">{new Date(order.createdAt).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div>
                      <div className="mt-2 text-xl font-semibold tracking-tight text-text-primary tnum">{formatAmount(order.bill_amount)}</div>
                      <div className="mt-1 truncate text-sm text-text-secondary">{formatPaymentMethod(order.payment_method)}</div>
                      {(loyalty || rewardText) && <div className="mt-3 flex flex-wrap items-center gap-1.5">{loyalty?.code && <span className="inline-flex items-center gap-1 rounded-full surface-2 px-2.5 py-1 text-xs text-text-secondary"><Tag className="size-3" aria-hidden />{loyalty.code}</span>}{rewardText && <span className="inline-flex items-center gap-1 rounded-full surface-2 px-2.5 py-1 text-xs text-text-secondary"><Sparkles className="size-3" aria-hidden />{rewardText}</span>}</div>}
                    </div>
                    <div className="flex flex-col items-end gap-2"><StatusBadge status={order.status ?? "pending"} /><ChevronRight className="size-4 text-text-muted transition-transform group-hover:translate-x-0.5" aria-hidden /></div>
                  </div>
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
