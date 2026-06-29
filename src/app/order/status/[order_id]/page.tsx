"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { ArrowLeft, CheckCircle2, Home as HomeIcon } from "lucide-react";
import axiosInstance from "@/utils/axios";
import { getRewardLabel } from "@/utils/rewardLabel";
import { getMerchantSession } from "@/utils/merchantSession";
import { useMerchantStore } from "@/context/merchantStore";
import { CustomerAppShell, type CustomerTab } from "@/components/customer/AppShell";
import { ErrorState, LuxurySurface, PrimaryAction, SkeletonSurface } from "@/components/customer/Primitives";

interface Order {
  id: number;
  merchant_id: number;
  bill_amount: string;
  createdAt: string;
  loyalty: { code: string } | null;
  reward: { type: string; discountType: string; discountValue: string; productName: string | null } | null;
  user: { name?: string; email: string } | null;
  merchant: { name: string };
  payment_method: { type: string; card_number: string | null; card_type: string | null; network: string | null; upi_id: string | null; linked_bank: string | null } | null;
}

export default function OrderStatusPage() {
  const { order_id } = useParams<{ order_id: string }>();
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const setMerchantId = useMerchantStore((state) => state.setMerchantId);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const session = getMerchantSession();
    if (!session) { router.replace("/login"); return; }
    setMerchantId(session.merchant_id);
  }, [router, setMerchantId]);

  const fetchOrder = () => {
    if (!order_id) return;
    setLoading(true); setError(false);
    axiosInstance.get(`/user/merchant/order/${order_id}`)
      .then((response) => setOrder(response.data?.data ?? response.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  };

  useEffect(fetchOrder, [order_id]);
  const logout = () => { ["owner_id", "owner_cap_id", "jwt", "api_key", "merchant_user"].forEach((key) => Cookies.remove(key)); window.location.href = "/login"; };
  const navigateTab = (tab: CustomerTab) => router.push(`/?tab=${tab}`);

  return (
    <CustomerAppShell activeTab="my-orders" merchantId={merchantId} onMerchantChange={setMerchantId} onTabChange={navigateTab} onLogout={logout}>
      <div className="mx-auto max-w-2xl">
        <div className="mb-5 flex items-center justify-between"><button type="button" onClick={() => router.push("/?tab=my-orders")} className="inline-flex items-center gap-1.5 text-sm text-text-secondary hover:text-text-primary"><ArrowLeft className="size-4" aria-hidden />Back to orders</button>{order && <span className="inline-flex items-center gap-1.5 text-xs text-success"><CheckCircle2 className="size-4" aria-hidden />Order created</span>}</div>
        {loading && <SkeletonSurface className="h-[520px]" />}
        {!loading && error && <ErrorState title="Order unavailable" description="Failed to load order details." onRetry={fetchOrder} />}
        {!loading && order && <LuxurySurface className="overflow-hidden p-0"><div className="relative px-7 pb-7 pt-8 text-white" style={{ backgroundImage: "var(--gradient-card)" }}><p className="text-[11px] uppercase tracking-[0.22em] text-white/70">Order</p><h1 className="mt-1 text-2xl font-semibold tracking-tight">{order.merchant.name}</h1><div className="mt-6 flex items-baseline gap-2"><span className="text-4xl font-semibold tracking-tight tnum">₹{Number(order.bill_amount).toFixed(2)}</span></div><p className="mt-1 text-sm text-white/80">{new Date(order.createdAt).toLocaleString()}</p></div><dl className="divide-y divide-border-subtle px-7 py-5 text-sm"><Detail label="Order ID" value={`#${order.id}`} mono /><Detail label="Customer" value={order.user?.email ?? order.user?.name ?? "—"} /><Detail label="Payment" value={formatPayment(order.payment_method)} />{order.loyalty?.code && <Detail label="Loyalty code" value={order.loyalty.code} />}{order.reward && <Detail label="Reward" value={getRewardLabel(order.reward)} />}<Detail label="Amount" value={`₹${Number(order.bill_amount).toFixed(2)}`} bold /></dl><div className="flex flex-wrap gap-3 border-t border-border-subtle px-7 py-5"><PrimaryAction variant="secondary" onClick={() => router.push("/?tab=my-orders")}>Back to orders</PrimaryAction><PrimaryAction onClick={() => router.push("/")}><HomeIcon className="size-4" aria-hidden />Return to membership</PrimaryAction></div></LuxurySurface>}
      </div>
    </CustomerAppShell>
  );
}

function formatPayment(payment: Order["payment_method"]) {
  if (!payment) return "—";
  if (payment.card_number) return `${payment.network?.toUpperCase() ?? payment.type.toUpperCase()} ${payment.card_type?.toUpperCase() ?? ""} **********${payment.card_number.slice(-4)}`.trim();
  return `${payment.type.toUpperCase()} ${payment.upi_id ?? ""}`.trim();
}
function Detail({ label, value, mono, bold }: { label: string; value: string; mono?: boolean; bold?: boolean }) {
  return <div className="grid grid-cols-[auto_minmax(0,1fr)] items-center gap-4 py-3"><dt className="text-text-muted">{label}</dt><dd className={`text-right text-text-primary ${mono ? "font-mono text-xs" : ""} ${bold ? "text-base font-semibold tnum" : ""}`}>{value}</dd></div>;
}
