"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Check, CreditCard, Gift, Lock, Sparkles, Tag, Wallet } from "lucide-react";
import axiosInstance from "@/utils/axios";
import notify from "@/utils/notify";
import { getRewardLabel } from "@/utils/rewardLabel";
import { useMerchantStore } from "@/context/merchantStore";
import { CustomerAppShell, type CustomerTab } from "@/components/customer/AppShell";
import { Field, LuxurySurface, PrimaryAction, StatusBadge } from "@/components/customer/Primitives";

type MerchantUser = { id: number; merchant_id: number };
interface AvailabilityRule { timezone: string; start_date?: string | null; end_date?: string | null; start_time?: string | null; end_time?: string | null; available_days?: string[] | null }
interface LoyaltyCode { id: number; code: string; value: number; type: string; is_active: boolean; availabilityRule: AvailabilityRule | null }
interface Reward { id: number; point_cost: number; type: string; discountType: string | null; discountValue: string | null; productName: string | null; required_tier: { id: number; level: number; name: string } | null; can_claim: boolean }
type CardPayment = { type: "card"; card_number: string; card_type: "debit" | "credit"; network: string; expiry: string };
type UPIPayment = { type: "upi"; upi_id: string; linked_bank: string };

const UPI_ID_PATTERN = /^[\w.-]+@[\w]+$/;
const formatAmount = (amount: number) => `Rs. ${amount.toFixed(2)}`;

function formatExpiryInput(value: string) { const digits = value.replace(/\D/g, "").slice(0, 4); return digits.length <= 2 ? digits : `${digits.slice(0, 2)}/${digits.slice(2)}`; }
function getExpiryError(expiry: string) { if (!expiry.trim()) return "Enter the card expiry date."; const match = /^(\d{2})\/(\d{2})$/.exec(expiry); if (!match) return "Expiry needs 4 digits in MM/YY format."; const month = Number(match[1]); return month < 1 || month > 12 ? "Expiry month must be between 01 and 12." : ""; }
function getUpiIdError(upiId: string) { if (!upiId.trim()) return "Enter a UPI ID."; return UPI_ID_PATTERN.test(upiId.trim()) ? "" : "UPI ID needs a valid handle. Example: name@bank"; }

function getApiValidationMessage(error: unknown) {
  if (!error || typeof error !== "object" || !("response" in error) || !error.response || typeof error.response !== "object" || !("data" in error.response)) return "";
  const data = error.response.data;
  if (!data || typeof data !== "object") return "";
  const details = "details" in data ? data.details : null;
  if (details && typeof details === "object") {
    const info = "info" in details ? details.info : null;
    const issues = info && typeof info === "object" && "issues" in info ? info.issues : "issues" in details ? details.issues : null;
    if (Array.isArray(issues)) {
      const issue = issues.find((item) => item && typeof item === "object" && "message" in item && typeof item.message === "string");
      if (issue && typeof issue.message === "string") return issue.message === "Invalid UPI ID" ? "UPI ID needs a valid handle. Example: name@bank" : issue.message;
    }
  }
  return "message" in data && typeof data.message === "string" ? data.message : "";
}

function isCodeAvailableNow(rule: AvailabilityRule | null) {
  if (!rule) return true;
  const now = new Date();
  let local: Date;
  try { local = new Date(now.toLocaleString("en-US", { timeZone: rule.timezone })); } catch { local = now; }
  if (rule.start_date && local < new Date(rule.start_date)) return false;
  if (rule.end_date) { const end = new Date(rule.end_date); end.setHours(23, 59, 59, 999); if (local > end) return false; }
  const currentTime = local.toTimeString().slice(0, 5);
  if (rule.start_time && currentTime < rule.start_time) return false;
  if (rule.end_time && currentTime > rule.end_time) return false;
  if (rule.available_days?.length) {
    const today = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"][local.getDay()];
    if (!rule.available_days.includes(today)) return false;
  }
  return true;
}

export default function OrderPage() {
  const router = useRouter();
  const merchantId = useMerchantStore((state) => state.merchantId);
  const setMerchantId = useMerchantStore((state) => state.setMerchantId);
  const [merchantUser, setMerchantUser] = useState<MerchantUser | null>(null);
  const [loyalties, setLoyalties] = useState<LoyaltyCode[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState(false);
  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState(false);
  const [selectedLoyaltyId, setSelectedLoyaltyId] = useState<number | null>(null);
  const [selectedRewardId, setSelectedRewardId] = useState<number | null>(null);
  const [billAmount, setBillAmount] = useState("");
  const [paymentTab, setPaymentTab] = useState<"card" | "upi">("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardType, setCardType] = useState<"debit" | "credit">("debit");
  const [network, setNetwork] = useState("");
  const [expiry, setExpiry] = useState("");
  const [upiId, setUpiId] = useState("");
  const [linkedBank, setLinkedBank] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [showErrors, setShowErrors] = useState(false);

  useEffect(() => {
    const raw = Cookies.get("merchant_user");
    if (!raw) { router.replace("/login"); return; }
    try {
      const parsed = JSON.parse(raw) as Partial<MerchantUser>;
      if (typeof parsed.id !== "number" || typeof parsed.merchant_id !== "number") { router.replace("/login"); return; }
      setMerchantUser({ id: parsed.id, merchant_id: parsed.merchant_id });
      setMerchantId(parsed.merchant_id);
    } catch { router.replace("/login"); }
  }, [router, setMerchantId]);

  useEffect(() => { if (merchantUser && merchantId && merchantUser.merchant_id !== merchantId) setMerchantUser({ ...merchantUser, merchant_id: merchantId }); }, [merchantId]);

  const loadLoyalties = useCallback(async () => {
    if (!merchantUser) return;
    setLoyaltyLoading(true); setLoyaltyError(false);
    try { const response = await axiosInstance.get(`/user/merchant/codes/${merchantUser.merchant_id}`); const all: LoyaltyCode[] = response.data.loyalties ?? []; setLoyalties(all.filter((item) => item.is_active && isCodeAvailableNow(item.availabilityRule ?? null))); }
    catch { setLoyaltyError(true); }
    finally { setLoyaltyLoading(false); }
  }, [merchantUser]);

  const loadRewards = useCallback(async () => {
    if (!merchantUser) return;
    setRewardsLoading(true); setRewardsError(false);
    try { const response = await axiosInstance.get("/user/merchant/rewards", { params: { merchant_id: merchantUser.merchant_id, user_id: merchantUser.id } }); setRewards(response.data.data ?? []); }
    catch { setRewardsError(true); }
    finally { setRewardsLoading(false); }
  }, [merchantUser]);

  useEffect(() => { if (merchantUser) { setSelectedLoyaltyId(null); setSelectedRewardId(null); loadLoyalties(); loadRewards(); } }, [loadLoyalties, loadRewards, merchantUser]);

  const billNumber = useMemo(() => { const amount = parseFloat(billAmount); return Number.isFinite(amount) && amount > 0 ? amount : 0; }, [billAmount]);
  const selectedReward = useMemo(() => rewards.find((item) => item.id === selectedRewardId) ?? null, [rewards, selectedRewardId]);
  const selectedLoyalty = useMemo(() => loyalties.find((item) => item.id === selectedLoyaltyId) ?? null, [loyalties, selectedLoyaltyId]);
  const { total, discount } = useMemo(() => {
    if (!selectedReward || selectedReward.type !== "DISCOUNT_ON_TOTAL" || !selectedReward.discountValue) return { total: billNumber, discount: 0 };
    const value = parseFloat(selectedReward.discountValue); if (!Number.isFinite(value)) return { total: billNumber, discount: 0 };
    const next = Math.max(0, selectedReward.discountType === "PERCENTAGE" ? billNumber * (1 - value / 100) : selectedReward.discountType === "FIXED_AMOUNT" ? billNumber - value : billNumber);
    return { total: next, discount: billNumber - next };
  }, [billNumber, selectedReward]);
  const paymentErrors = useMemo(() => paymentTab === "card" ? { cardNumber: !cardNumber ? "Enter the card number." : /^\d{12,19}$/.test(cardNumber) ? "" : "Card number needs 12 to 19 digits.", network: network.trim() ? "" : "Enter the card network.", expiry: getExpiryError(expiry) } : { upiId: getUpiIdError(upiId) }, [cardNumber, expiry, network, paymentTab, upiId]);
  const paymentValid = Object.values(paymentErrors).every((error) => !error);
  const canSubmit = Boolean(merchantUser) && billNumber > 0 && paymentValid && !submitting;

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault(); setShowErrors(true);
    if (!paymentValid) { notify(Object.values(paymentErrors).find(Boolean) || "Check the payment details and try again.", "error"); return; }
    if (!canSubmit || !merchantUser) return;
    const payment_method: CardPayment | UPIPayment = paymentTab === "card" ? { type: "card", card_number: cardNumber, card_type: cardType, network, expiry } : { type: "upi", upi_id: upiId, linked_bank: linkedBank };
    setSubmitting(true);
    try {
      const response = await axiosInstance.post("/user/merchant/order/create", { user_id: merchantUser.id, merchant_id: merchantUser.merchant_id, bill_amount: total, payment_method, selected_loyalty_id: selectedLoyaltyId, selected_reward_id: selectedRewardId, status: "pending" });
      notify("Order created successfully!", "success");
      router.push(`/order/status/${response.data.data.id}`);
    } catch (error) { notify(getApiValidationMessage(error) || "We could not create this order. Check the details and try again.", "error"); }
    finally { setSubmitting(false); }
  };

  const logout = () => { ["owner_id", "owner_cap_id", "jwt", "api_key", "merchant_user"].forEach((key) => Cookies.remove(key)); window.location.href = "/login"; };
  const navigateTab = (tab: CustomerTab) => router.push(`/?tab=${tab}`);
  if (!merchantUser) return <div className="min-h-dvh bg-background" />;

  return (
    <CustomerAppShell activeTab="summary" merchantId={merchantId ?? merchantUser.merchant_id} onMerchantChange={setMerchantId} onTabChange={navigateTab} onLogout={logout}>
      <header className="mb-6"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Checkout</h1></header>
      <form onSubmit={handleSubmit} className="grid min-w-0 grid-cols-[minmax(0,1fr)] gap-6 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="min-w-0 space-y-6">
          <LuxurySurface><h2 className="text-sm font-medium uppercase tracking-[0.14em] text-text-muted">Bill amount</h2><div className="mt-4"><Field label="Amount" name="bill" type="number" min="0" step="0.01" inputMode="decimal" value={billAmount} onChange={(event) => setBillAmount(event.target.value)} trailing={<span className="text-sm text-text-muted">INR</span>} error={showErrors && billNumber <= 0 ? "Enter a valid amount" : undefined} /></div></LuxurySurface>
          <LuxurySurface>
            <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-text-muted">Payment method</h2>
            <div role="tablist" className="mt-3 grid min-w-0 grid-cols-2 gap-2 rounded-2xl surface-2 p-1">{(["card", "upi"] as const).map((type) => <button key={type} type="button" role="tab" aria-selected={paymentTab === type} onClick={() => setPaymentTab(type)} className={`flex h-11 min-w-0 items-center justify-center gap-2 rounded-xl text-sm transition-all ${paymentTab === type ? "bg-surface-raised text-text-primary" : "text-text-secondary"}`}>{type === "card" ? <CreditCard className="size-4 shrink-0" /> : <Wallet className="size-4 shrink-0" />}{type === "card" ? "Card" : "UPI"}</button>)}</div>
            {paymentTab === "card" ? <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="Card number" name="number" inputMode="numeric" autoComplete="cc-number" value={cardNumber} onChange={(event) => setCardNumber(event.target.value.replace(/\D/g, ""))} error={(showErrors || cardNumber.length > 0) ? "cardNumber" in paymentErrors ? paymentErrors.cardNumber : undefined : undefined} /></div><Field label="Expiry" name="expiry" placeholder="MM/YY" value={expiry} onChange={(event) => setExpiry(formatExpiryInput(event.target.value))} error={(showErrors || expiry.length > 0) ? "expiry" in paymentErrors ? paymentErrors.expiry : undefined : undefined} /><div><label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Network</label><input value={network} onChange={(event) => setNetwork(event.target.value)} className={`h-12 w-full rounded-2xl border bg-surface-2 px-3.5 text-[15px] text-text-primary outline-none focus:border-accent-violet ${showErrors && "network" in paymentErrors && paymentErrors.network ? "border-danger" : "border-border-subtle"}`} /></div><div className="sm:col-span-2"><label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Card type</label><div className="grid grid-cols-2 gap-2 rounded-2xl surface-2 p-1">{(["debit", "credit"] as const).map((type) => <button key={type} type="button" aria-pressed={cardType === type} onClick={() => setCardType(type)} className={`h-10 rounded-xl text-sm capitalize transition-all ${cardType === type ? "bg-surface-raised text-text-primary" : "text-text-secondary"}`}>{type}</button>)}</div></div></div> : <div className="mt-5 grid gap-4 sm:grid-cols-2"><div className="sm:col-span-2"><Field label="UPI ID" name="upi" placeholder="name@bank" value={upiId} onChange={(event) => setUpiId(event.target.value.trim())} error={(showErrors || upiId.length > 0) ? "upiId" in paymentErrors ? paymentErrors.upiId : undefined : undefined} /></div><div className="sm:col-span-2"><Field label="Linked bank (optional)" name="bank" value={linkedBank} onChange={(event) => setLinkedBank(event.target.value)} /></div></div>}
          </LuxurySurface>
          <LuxurySurface><h2 className="text-sm font-medium uppercase tracking-[0.14em] text-text-muted">Loyalty code</h2><div className="mt-3">{loyaltyLoading ? <LoadingRows /> : loyaltyError ? <RetryRow message="Failed to load loyalty codes." onRetry={loadLoyalties} /> : loyalties.length === 0 ? <EmptyRow message="No loyalty codes available." /> : <ul className="space-y-2">{loyalties.map((loyalty) => { const selected = selectedLoyaltyId === loyalty.id; return <li key={loyalty.id}><button type="button" aria-pressed={selected} onClick={() => setSelectedLoyaltyId(selected ? null : loyalty.id)} className={`flex w-full items-center gap-3 rounded-2xl border p-4 text-left transition-all ${selected ? "border-accent-coral surface-2" : "border-border-subtle surface-1 hover:border-border-strong"}`}><Tag className="size-4 text-accent-coral" aria-hidden /><span className="min-w-0 flex-1"><span className="block font-medium">{loyalty.code}</span><span className="block truncate text-sm text-text-secondary">{loyalty.value} points</span></span>{selected && <Check className="size-4 text-accent-coral" />}</button></li>; })}</ul>}</div></LuxurySurface>
          <LuxurySurface><h2 className="text-sm font-medium uppercase tracking-[0.14em] text-text-muted">Apply a reward</h2><div className="mt-3">{rewardsLoading ? <LoadingRows /> : rewardsError ? <RetryRow message="Failed to load rewards." onRetry={loadRewards} /> : rewards.length === 0 ? <EmptyRow message="No rewards available." /> : <div className="grid gap-3 sm:grid-cols-2">{rewards.map((reward) => <SelectableReward key={reward.id} reward={reward} selected={selectedRewardId === reward.id} onSelect={() => setSelectedRewardId(selectedRewardId === reward.id ? null : reward.id)} />)}</div>}</div></LuxurySurface>
        </div>
        <aside className="min-w-0 lg:sticky lg:top-24 lg:self-start"><LuxurySurface className="space-y-4"><h2 className="text-base font-medium">Order summary</h2><dl className="space-y-2 text-sm"><Line label="Bill" value={formatAmount(billNumber)} />{selectedLoyalty && <Line label="Loyalty" value={selectedLoyalty.code} muted />}{selectedReward && <Line label="Reward" value={selectedReward.productName ?? getRewardLabel(selectedReward)} muted />}{discount > 0 && <Line label="Discount" value={`− ${formatAmount(discount)}`} accent />}</dl><div className="border-t border-border-subtle pt-4"><div className="flex items-baseline justify-between"><span className="text-sm text-text-muted">Total</span><span className="text-2xl font-semibold tracking-tight tnum">{formatAmount(total)}</span></div></div><PrimaryAction type="submit" fullWidth loading={submitting} disabled={!canSubmit}><Sparkles className="size-4" aria-hidden />{submitting ? "Creating order…" : "Confirm order"}</PrimaryAction>{showErrors && !canSubmit && <p role="alert" className="text-xs text-danger">Please complete the highlighted fields.</p>}</LuxurySurface></aside>
      </form>
    </CustomerAppShell>
  );
}

function SelectableReward({ reward, selected, onSelect }: { reward: Reward; selected: boolean; onSelect: () => void }) {
  const locked = !reward.can_claim;
  const Icon = reward.type.includes("FREE") ? Gift : reward.type.includes("BOGO") ? Sparkles : Tag;
  const label = getRewardLabel(reward);
  return <button type="button" onClick={onSelect} disabled={locked} aria-pressed={selected} className={`group relative min-w-0 max-w-full rounded-3xl border p-4 text-left transition-all duration-200 ease-out ${selected ? "border-accent-coral bg-surface-2 shadow-[0_0_0_3px_rgba(233,103,129,0.18)]" : "border-border-subtle bg-surface-1 hover:border-border-strong"} ${locked ? "cursor-not-allowed opacity-60" : ""}`}><div className="relative grid h-32 place-items-center overflow-hidden rounded-2xl" style={{ backgroundImage: locked ? "linear-gradient(135deg, #1d1a2b, #2a2640)" : "var(--gradient-card)" }}><Icon className={`size-9 ${locked ? "text-text-muted" : "text-white"}`} />{locked && <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-full bg-black/40 px-2 py-1 text-[10px] uppercase tracking-wider text-white/80"><Lock className="size-3" />Locked</span>}</div><div className="mt-4 min-w-0"><div className="flex min-w-0 items-start justify-between gap-2"><h3 className="min-w-0 flex-1 truncate text-[15px] font-medium text-text-primary">{reward.productName ?? label}</h3><span className="shrink-0"><StatusBadge status={locked ? "unavailable" : "available"} /></span></div><p className="mt-1 line-clamp-2 text-sm text-text-secondary">{label}</p><div className="mt-3 text-xs text-text-muted">{reward.required_tier ? `${reward.required_tier.name} tier` : `${reward.point_cost.toLocaleString()} pts`}</div></div></button>;
}
function Line({ label, value, muted, accent }: { label: string; value: string; muted?: boolean; accent?: boolean }) { return <div className="flex items-center justify-between gap-3"><dt className="text-text-muted">{label}</dt><dd className={`tnum ${accent ? "text-success" : muted ? "text-text-secondary" : "text-text-primary"}`}>{value}</dd></div>; }
function LoadingRows() { return <div className="space-y-2">{[0, 1].map((index) => <div key={index} className="h-16 animate-pulse rounded-2xl surface-2" />)}</div>; }
function EmptyRow({ message }: { message: string }) { return <div className="rounded-2xl border border-dashed border-border-subtle px-4 py-5 text-center text-sm text-text-muted">{message}</div>; }
function RetryRow({ message, onRetry }: { message: string; onRetry: () => void }) { return <div className="flex items-center justify-between gap-3 rounded-2xl border border-danger/30 bg-danger/10 px-4 py-3 text-sm text-danger"><span>{message}</span><button type="button" onClick={onRetry} className="rounded-xl px-3 py-2 text-xs font-semibold hover:bg-danger/10">Retry</button></div>; }
