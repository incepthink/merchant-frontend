"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import {
  ArrowLeft,
  Check,
  ChevronRight,
  CreditCard,
  Gift,
  Loader2,
  Moon,
  Receipt,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sun,
  Tag,
  UserRound,
} from "lucide-react";
import axiosInstance from "@/utils/axios";
import notify from "@/utils/notify";
import { getRewardLabel } from "@/utils/rewardLabel";

type Theme = "light" | "dark";

type MerchantUser = {
  id: number;
  merchant_id: number;
};

interface AvailabilityRule {
  timezone: string;
  start_date?: string | null;
  end_date?: string | null;
  start_time?: string | null;
  end_time?: string | null;
  available_days?: string[] | null;
}

interface LoyaltyCode {
  id: number;
  code: string;
  value: number;
  type: string;
  is_active: boolean;
  availabilityRule: AvailabilityRule | null;
}

interface RequiredTier {
  id: number;
  level: number;
  name: string;
}

interface Reward {
  id: number;
  point_cost: number;
  type: string;
  discountType: string | null;
  discountValue: string | null;
  productName: string | null;
  required_tier: RequiredTier | null;
  can_claim: boolean;
}

type CardPayment = {
  type: "card";
  card_number: string;
  card_type: "debit" | "credit";
  network: string;
  expiry: string;
};

type UPIPayment = {
  type: "upi";
  upi_id: string;
  linked_bank: string;
};

function isCodeAvailableNow(availabilityRule: AvailabilityRule | null) {
  if (!availabilityRule) return true;

  const now = new Date();
  let tzNow: Date;
  try {
    tzNow = new Date(
      now.toLocaleString("en-US", { timeZone: availabilityRule.timezone }),
    );
  } catch {
    tzNow = now;
  }

  if (availabilityRule.start_date) {
    if (tzNow < new Date(availabilityRule.start_date)) return false;
  }

  if (availabilityRule.end_date) {
    const end = new Date(availabilityRule.end_date);
    end.setHours(23, 59, 59, 999);
    if (tzNow > end) return false;
  }

  const currentTime = tzNow.toTimeString().slice(0, 5);
  if (availabilityRule.start_time && currentTime < availabilityRule.start_time) {
    return false;
  }
  if (availabilityRule.end_time && currentTime > availabilityRule.end_time) {
    return false;
  }

  if (
    availabilityRule.available_days &&
    availabilityRule.available_days.length > 0
  ) {
    const dayNames = [
      "sunday",
      "monday",
      "tuesday",
      "wednesday",
      "thursday",
      "friday",
      "saturday",
    ];
    const todayName = dayNames[tzNow.getDay()];
    if (!availabilityRule.available_days.includes(todayName)) return false;
  }

  return true;
}

function formatAmount(amount: number) {
  return `Rs. ${amount.toFixed(2)}`;
}

const themeStyles = {
  light: {
    page: "bg-[#e7ebf2] text-[#12151f]",
    shell:
      "border-[#d9dee8] bg-white shadow-[0_24px_70px_rgba(25,34,55,0.16)]",
    panel: "bg-white",
    summary: "border-l-[#e1e5ed] bg-[#f5f7fb]",
    text: "text-[#12151f]",
    muted: "text-[#697182]",
    subtlest: "text-[#8b93a3]",
    border: "border-[#dce1ea]",
    divider: "bg-[#e3e7ef]",
    field:
      "border-[#d8dde8] bg-white text-[#12151f] placeholder:text-[#a1a8b5] focus:border-[#3157f6] focus:ring-[#3157f6]/10",
    quietButton:
      "border-[#d8dde8] bg-white text-[#4b5567] hover:border-[#b9c0cf] hover:text-[#12151f]",
    subtle: "border-[#e1e5ed] bg-[#f8f9fc]",
    subtleHover: "hover:border-[#b9c0cf]",
    active: "border-[#3157f6] bg-[#f4f6ff] ring-[#3157f6]",
    cta: "bg-[#3157f6] text-white hover:bg-[#2548dd]",
    disabled: "bg-[#d8dde8] text-[#8992a3]",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  },
  dark: {
    page: "bg-[#080c14] text-[#f4f7fb]",
    shell:
      "border-[#222b3a] bg-[#0f1623] shadow-[0_24px_80px_rgba(0,0,0,0.42)]",
    panel: "bg-[#0f1623]",
    summary: "border-l-[#222b3a] bg-[#0b111d]",
    text: "text-[#f4f7fb]",
    muted: "text-[#a6afbf]",
    subtlest: "text-[#798295]",
    border: "border-[#273244]",
    divider: "bg-[#232d3d]",
    field:
      "border-[#2a3547] bg-[#0b111d] text-[#f4f7fb] placeholder:text-[#667085] focus:border-[#6f8cff] focus:ring-[#6f8cff]/15",
    quietButton:
      "border-[#2a3547] bg-[#121b2a] text-[#c3cad7] hover:border-[#46556c] hover:text-white",
    subtle: "border-[#253044] bg-[#111a29]",
    subtleHover: "hover:border-[#46556c]",
    active: "border-[#6f8cff] bg-[#16213a] ring-[#6f8cff]",
    cta: "bg-[#6f8cff] text-[#07101f] hover:bg-[#86a0ff]",
    disabled: "bg-[#1d2635] text-[#6f7889]",
    success: "border-emerald-500/25 bg-emerald-500/10 text-emerald-200",
    warning: "border-amber-500/25 bg-amber-500/10 text-amber-200",
  },
} satisfies Record<Theme, Record<string, string>>;

export default function OrderPage() {
  const router = useRouter();
  const [theme, setTheme] = useState<Theme>("light");
  const [merchantUser, setMerchantUser] = useState<MerchantUser | null>(null);

  const [loyalties, setLoyalties] = useState<LoyaltyCode[]>([]);
  const [loyaltyLoading, setLoyaltyLoading] = useState(false);
  const [loyaltyError, setLoyaltyError] = useState(false);

  const [rewards, setRewards] = useState<Reward[]>([]);
  const [rewardsLoading, setRewardsLoading] = useState(false);
  const [rewardsError, setRewardsError] = useState(false);

  const [selectedLoyaltyId, setSelectedLoyaltyId] = useState<number | null>(
    null,
  );
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

  const s = themeStyles[theme];

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("hashcase-checkout-theme");
    if (savedTheme === "light" || savedTheme === "dark") {
      setTheme(savedTheme);
    }
  }, []);

  const updateTheme = (nextTheme: Theme) => {
    setTheme(nextTheme);
    window.localStorage.setItem("hashcase-checkout-theme", nextTheme);
  };

  useEffect(() => {
    const raw = Cookies.get("merchant_user");
    if (!raw) {
      router.replace("/login");
      return;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<MerchantUser>;
      if (
        typeof parsed.id !== "number" ||
        typeof parsed.merchant_id !== "number"
      ) {
        router.replace("/login");
        return;
      }
      setMerchantUser({ id: parsed.id, merchant_id: parsed.merchant_id });
    } catch {
      router.replace("/login");
    }
  }, [router]);

  const loadLoyalties = useCallback(async () => {
    if (!merchantUser) return;

    setLoyaltyLoading(true);
    setLoyaltyError(false);
    try {
      const response = await axiosInstance.get(
        `/user/merchant/codes/${merchantUser.merchant_id}`,
      );
      const all: LoyaltyCode[] = response.data.loyalties ?? [];
      setLoyalties(
        all.filter(
          (loyalty) =>
            loyalty.is_active &&
            isCodeAvailableNow(loyalty.availabilityRule ?? null),
        ),
      );
    } catch {
      setLoyaltyError(true);
    } finally {
      setLoyaltyLoading(false);
    }
  }, [merchantUser]);

  const loadRewards = useCallback(async () => {
    if (!merchantUser) return;

    setRewardsLoading(true);
    setRewardsError(false);
    try {
      const response = await axiosInstance.get("/user/merchant/rewards", {
        params: {
          merchant_id: merchantUser.merchant_id,
          user_id: merchantUser.id,
        },
      });
      setRewards(response.data.data ?? []);
    } catch {
      setRewardsError(true);
    } finally {
      setRewardsLoading(false);
    }
  }, [merchantUser]);

  useEffect(() => {
    if (!merchantUser) return;
    loadLoyalties();
    loadRewards();
  }, [loadLoyalties, loadRewards, merchantUser]);

  const billNumber = useMemo(() => {
    const amount = parseFloat(billAmount);
    return Number.isFinite(amount) && amount > 0 ? amount : 0;
  }, [billAmount]);

  const selectedReward = useMemo(
    () => rewards.find((reward) => reward.id === selectedRewardId) ?? null,
    [rewards, selectedRewardId],
  );

  const selectedLoyalty = useMemo(
    () =>
      loyalties.find((loyalty) => loyalty.id === selectedLoyaltyId) ?? null,
    [loyalties, selectedLoyaltyId],
  );

  const { finalAmount, discountAmount } = useMemo(() => {
    if (
      !selectedReward ||
      selectedReward.type !== "DISCOUNT_ON_TOTAL" ||
      !selectedReward.discountValue
    ) {
      return { finalAmount: billNumber, discountAmount: 0 };
    }

    const discountValue = parseFloat(selectedReward.discountValue);
    if (!Number.isFinite(discountValue)) {
      return { finalAmount: billNumber, discountAmount: 0 };
    }

    let nextAmount = billNumber;
    if (selectedReward.discountType === "PERCENTAGE") {
      nextAmount = billNumber * (1 - discountValue / 100);
    } else if (selectedReward.discountType === "FIXED_AMOUNT") {
      nextAmount = billNumber - discountValue;
    }

    nextAmount = Math.max(0, nextAmount);
    return {
      finalAmount: nextAmount,
      discountAmount: billNumber - nextAmount,
    };
  }, [billNumber, selectedReward]);

  const paymentValid = useMemo(() => {
    if (paymentTab === "card") {
      return (
        cardNumber.trim().length > 0 &&
        network.trim().length > 0 &&
        expiry.trim().length > 0
      );
    }

    return upiId.trim().length > 0;
  }, [cardNumber, expiry, network, paymentTab, upiId]);

  const canSubmit =
    Boolean(merchantUser) && billNumber > 0 && paymentValid && !submitting;

  const summaryHint = useMemo(() => {
    if (billNumber <= 0 && !paymentValid) {
      return "Add bill amount and payment details";
    }
    if (billNumber <= 0) return "Add bill amount";
    if (!paymentValid) return "Add payment details";
    return "Ready to create order";
  }, [billNumber, paymentValid]);

  const handleSubmit = async () => {
    if (!canSubmit || !merchantUser) return;

    const payment_method: CardPayment | UPIPayment =
      paymentTab === "card"
        ? {
            type: "card",
            card_number: cardNumber,
            card_type: cardType,
            network,
            expiry,
          }
        : {
            type: "upi",
            upi_id: upiId,
            linked_bank: linkedBank,
          };

    setSubmitting(true);
    try {
      const response = await axiosInstance.post("/user/merchant/order/create", {
        user_id: merchantUser.id,
        merchant_id: merchantUser.merchant_id,
        bill_amount: finalAmount,
        payment_method,
        selected_loyalty_id: selectedLoyaltyId,
        selected_reward_id: selectedRewardId,
        status: "pending",
      });

      const orderId = response.data.data.id;
      notify("Order created successfully!", "success");
      router.push(`/order/status/${orderId}`);
    } catch {
      notify("Failed to create order. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (!merchantUser) {
    return (
      <div className={`flex min-h-screen items-center justify-center ${s.page}`}>
        <Loader2 className="h-6 w-6 animate-spin text-[#3157f6]" />
      </div>
    );
  }

  return (
    <main className={`min-h-screen px-4 py-6 md:px-6 md:py-10 ${s.page}`}>
      <div
        className={`mx-auto grid w-full max-w-[1180px] overflow-hidden rounded-xl border lg:grid-cols-[minmax(0,1fr)_390px] ${s.shell}`}
      >
        <section className={`p-5 md:p-8 lg:p-10 ${s.panel}`}>
          <header className="mb-8 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <button
                type="button"
                onClick={() => router.back()}
                aria-label="Go back"
                className={`inline-flex h-10 w-10 items-center justify-center rounded-lg border transition ${s.quietButton}`}
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <p className={`text-xs font-medium ${s.muted}`}>
                  Hashcase merchant checkout
                </p>
                <h1 className={`mt-1 text-2xl font-semibold ${s.text}`}>
                  Create order
                </h1>
              </div>
            </div>

            <ThemeSwitch theme={theme} setTheme={updateTheme} />
          </header>

          <div className={`rounded-xl border ${s.border}`}>
            <div className="grid grid-cols-1 md:grid-cols-3">
              <ContextCell
                icon={<UserRound className="h-4 w-4" />}
                label="Customer"
                value={`#${merchantUser.id}`}
                styles={s}
              />
              <ContextCell
                icon={<Receipt className="h-4 w-4" />}
                label="Merchant"
                value={`#${merchantUser.merchant_id}`}
                styles={s}
              />
              <label className={`block border-t p-4 md:border-l md:border-t-0 ${s.border}`}>
                <span className={`text-xs font-medium ${s.muted}`}>
                  Bill amount
                </span>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={billAmount}
                  onChange={(event) => setBillAmount(event.target.value)}
                  placeholder="0.00"
                  className={`mt-1 w-full bg-transparent text-xl font-semibold outline-none placeholder:text-current ${s.text}`}
                />
              </label>
            </div>
          </div>

          <section className="mt-8">
            <SectionHeader
              title="Payment method"
              description="Collect the payment details used for this order."
              styles={s}
            />
            <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <MethodButton
                active={paymentTab === "card"}
                icon={<CreditCard className="h-5 w-5" />}
                title="Card"
                subtitle="Debit or credit"
                onClick={() => setPaymentTab("card")}
                styles={s}
              />
              <MethodButton
                active={paymentTab === "upi"}
                icon={<Smartphone className="h-5 w-5" />}
                title="UPI"
                subtitle="UPI ID"
                onClick={() => setPaymentTab("upi")}
                styles={s}
              />
            </div>

            <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
              {paymentTab === "card" ? (
                <>
                  <Field label="Card number" className="md:col-span-2" styles={s}>
                    <input
                      inputMode="numeric"
                      maxLength={19}
                      value={cardNumber}
                      onChange={(event) =>
                        setCardNumber(event.target.value.replace(/\D/g, ""))
                      }
                      placeholder="12-19 digit card number"
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 ${s.field}`}
                    />
                  </Field>
                  <Field label="Card type" styles={s}>
                    <select
                      value={cardType}
                      onChange={(event) =>
                        setCardType(event.target.value as "debit" | "credit")
                      }
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 ${s.field}`}
                    >
                      <option value="debit">Debit</option>
                      <option value="credit">Credit</option>
                    </select>
                  </Field>
                  <Field label="Network" styles={s}>
                    <input
                      value={network}
                      onChange={(event) => setNetwork(event.target.value)}
                      placeholder="Visa, Mastercard, RuPay"
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 ${s.field}`}
                    />
                  </Field>
                  <Field label="Expiry (MM/YY)" className="md:col-span-2" styles={s}>
                    <input
                      maxLength={5}
                      value={expiry}
                      onChange={(event) => setExpiry(event.target.value)}
                      placeholder="MM/YY"
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 ${s.field}`}
                    />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="UPI ID" className="md:col-span-2" styles={s}>
                    <input
                      value={upiId}
                      onChange={(event) => setUpiId(event.target.value)}
                      placeholder="customer@bank"
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 ${s.field}`}
                    />
                  </Field>
                  <Field
                    label="Linked bank (optional)"
                    className="md:col-span-2"
                    styles={s}
                  >
                    <input
                      value={linkedBank}
                      onChange={(event) => setLinkedBank(event.target.value)}
                      placeholder="HDFC, ICICI"
                      className={`w-full rounded-lg border px-4 py-3 text-sm font-medium outline-none transition focus:ring-4 ${s.field}`}
                    />
                  </Field>
                </>
              )}
            </div>
          </section>

          <div className="mt-8 grid grid-cols-1 gap-6 xl:grid-cols-2">
            <BenefitPanel
              icon={<Tag className="h-4 w-4" />}
              title="Loyalty code"
              description="Apply one available earning code."
              styles={s}
            >
              {loyaltyLoading ? (
                <SkeletonRows styles={s} />
              ) : loyaltyError ? (
                <StateRow
                  kind="error"
                  message="Failed to load loyalty codes."
                  onRetry={loadLoyalties}
                  styles={s}
                />
              ) : loyalties.length === 0 ? (
                <StateRow
                  message="No loyalty codes available right now."
                  styles={s}
                />
              ) : (
                <div className="space-y-2">
                  {loyalties.map((loyalty) => {
                    const active = selectedLoyaltyId === loyalty.id;
                    const valueLabel =
                      loyalty.type === "fixed" || loyalty.type === "FIXED"
                        ? `${loyalty.value} Points`
                        : "Variable points";

                    return (
                      <SelectableRow
                        key={loyalty.id}
                        active={active}
                        title={loyalty.code}
                        subtitle={valueLabel}
                        onClick={() =>
                          setSelectedLoyaltyId(active ? null : loyalty.id)
                        }
                        styles={s}
                      />
                    );
                  })}
                </div>
              )}
            </BenefitPanel>

            <BenefitPanel
              icon={<Gift className="h-4 w-4" />}
              title="Rewards"
              description="Redeem one unlocked reward."
              styles={s}
            >
              {rewardsLoading ? (
                <SkeletonRows styles={s} />
              ) : rewardsError ? (
                <StateRow
                  kind="error"
                  message="Failed to load rewards."
                  onRetry={loadRewards}
                  styles={s}
                />
              ) : rewards.length === 0 ? (
                <StateRow message="No rewards available right now." styles={s} />
              ) : (
                <div className="space-y-2">
                  {rewards.map((reward) => {
                    const active = selectedRewardId === reward.id;
                    const costLabel = reward.required_tier
                      ? `0 (${reward.required_tier.name} Tier Reward)`
                      : `${reward.point_cost} Points`;

                    return (
                      <SelectableRow
                        key={reward.id}
                        active={active}
                        disabled={!reward.can_claim}
                        title={getRewardLabel(reward)}
                        subtitle={costLabel}
                        unavailableLabel="Unavailable"
                        onClick={() =>
                          setSelectedRewardId(active ? null : reward.id)
                        }
                        styles={s}
                      />
                    );
                  })}
                </div>
              )}
            </BenefitPanel>
          </div>
        </section>

        <aside className={`border-t p-5 md:p-8 lg:border-l lg:border-t-0 ${s.summary}`}>
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className={`text-xs font-medium ${s.muted}`}>Amount due</p>
              <p className={`mt-2 text-3xl font-semibold tracking-[-0.03em] ${s.text}`}>
                {billNumber > 0 ? formatAmount(finalAmount) : "Rs. 0.00"}
              </p>
            </div>
            <div className={`rounded-lg border px-3 py-2 ${s.subtle}`}>
              <ShieldCheck className="h-5 w-5 text-emerald-500" />
            </div>
          </div>

          <div className={`my-7 h-px ${s.divider}`} />

          <div>
            <h2 className={`text-sm font-semibold ${s.text}`}>Order summary</h2>
            <div className="mt-5 space-y-4">
              <SummaryLine
                title="Bill amount"
                subtitle={paymentTab === "card" ? "Card payment" : "UPI payment"}
                value={billNumber > 0 ? formatAmount(billNumber) : "-"}
                styles={s}
              />
              {selectedLoyalty && (
                <SummaryLine
                  title={selectedLoyalty.code}
                  subtitle="Loyalty code"
                  value="Applied"
                  styles={s}
                />
              )}
              {selectedReward && (
                <SummaryLine
                  title={getRewardLabel(selectedReward)}
                  subtitle="Reward"
                  value={
                    discountAmount > 0
                      ? `- ${formatAmount(discountAmount)}`
                      : "Applied"
                  }
                  styles={s}
                />
              )}
            </div>
          </div>

          <div className={`my-7 h-px ${s.divider}`} />

          <div className="space-y-3">
            <SummaryTotal
              label="Subtotal"
              value={billNumber > 0 ? formatAmount(billNumber) : "-"}
              styles={s}
            />
            <SummaryTotal
              label="Discount"
              value={discountAmount > 0 ? `- ${formatAmount(discountAmount)}` : "-"}
              styles={s}
            />
            <SummaryTotal
              label="Total"
              value={billNumber > 0 ? formatAmount(finalAmount) : "-"}
              strong
              styles={s}
            />
          </div>

          <div
            className={`mt-7 rounded-lg border px-4 py-3 text-sm ${
              canSubmit ? s.success : s.warning
            }`}
          >
            {summaryHint}
          </div>

          <button
            type="button"
            onClick={handleSubmit}
            disabled={!canSubmit}
            className={`mt-4 inline-flex w-full items-center justify-center gap-3 rounded-lg px-5 py-4 text-sm font-semibold transition ${
              canSubmit ? s.cta : `cursor-not-allowed ${s.disabled}`
            }`}
          >
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creating order...
              </>
            ) : (
              <>
                Confirm order
                <ChevronRight className="h-4 w-4" />
              </>
            )}
          </button>
        </aside>
      </div>
    </main>
  );
}

function ThemeSwitch({
  theme,
  setTheme,
}: {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}) {
  return (
    <div className="inline-flex rounded-lg border border-current/10 bg-current/5 p-1">
      <button
        type="button"
        onClick={() => setTheme("light")}
        aria-pressed={theme === "light"}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
          theme === "light"
            ? "bg-white text-[#12151f] shadow-sm"
            : "text-current/65 hover:text-current"
        }`}
      >
        <Sun className="h-3.5 w-3.5" />
        Light
      </button>
      <button
        type="button"
        onClick={() => setTheme("dark")}
        aria-pressed={theme === "dark"}
        className={`inline-flex items-center gap-2 rounded-md px-3 py-2 text-xs font-semibold transition ${
          theme === "dark"
            ? "bg-[#1e293b] text-white shadow-sm"
            : "text-current/65 hover:text-current"
        }`}
      >
        <Moon className="h-3.5 w-3.5" />
        Dark
      </button>
    </div>
  );
}

function ContextCell({
  icon,
  label,
  value,
  styles,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <div className={`flex items-center gap-3 border-b p-4 md:border-b-0 md:border-r ${styles.border}`}>
      <span className={styles.subtlest}>{icon}</span>
      <div>
        <p className={`text-xs font-medium ${styles.muted}`}>{label}</p>
        <p className={`mt-0.5 text-sm font-semibold ${styles.text}`}>{value}</p>
      </div>
    </div>
  );
}

function SectionHeader({
  title,
  description,
  styles,
}: {
  title: string;
  description: string;
  styles: Record<string, string>;
}) {
  return (
    <div>
      <h2 className={`text-sm font-semibold ${styles.text}`}>{title}</h2>
      <p className={`mt-1 text-sm ${styles.muted}`}>{description}</p>
    </div>
  );
}

function Field({
  label,
  children,
  className = "",
  styles,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
  styles: Record<string, string>;
}) {
  return (
    <label className={`block ${className}`}>
      <span className={`mb-2 block text-xs font-semibold ${styles.muted}`}>
        {label}
      </span>
      {children}
    </label>
  );
}

function MethodButton({
  active,
  icon,
  title,
  subtitle,
  onClick,
  styles,
}: {
  active: boolean;
  icon: React.ReactNode;
  title: string;
  subtitle: string;
  onClick: () => void;
  styles: Record<string, string>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`flex items-center gap-4 rounded-lg border px-4 py-4 text-left transition ${
        active ? styles.active : `${styles.subtle} ${styles.subtleHover}`
      }`}
    >
      <span className={active ? "text-[#3157f6]" : styles.subtlest}>{icon}</span>
      <span>
        <span className={`block text-sm font-semibold ${styles.text}`}>
          {title}
        </span>
        <span className={`mt-0.5 block text-xs ${styles.muted}`}>
          {subtitle}
        </span>
      </span>
    </button>
  );
}

function BenefitPanel({
  icon,
  title,
  description,
  children,
  styles,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  children: React.ReactNode;
  styles: Record<string, string>;
}) {
  return (
    <section>
      <div className="mb-3 flex items-start gap-3">
        <span className={`mt-0.5 ${styles.subtlest}`}>{icon}</span>
        <div>
          <h3 className={`text-sm font-semibold ${styles.text}`}>{title}</h3>
          <p className={`mt-1 text-xs ${styles.muted}`}>{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SelectableRow({
  active,
  disabled = false,
  title,
  subtitle,
  unavailableLabel,
  onClick,
  styles,
}: {
  active: boolean;
  disabled?: boolean;
  title: string;
  subtitle: string;
  unavailableLabel?: string;
  onClick: () => void;
  styles: Record<string, string>;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-pressed={active}
      className={`flex w-full items-center justify-between gap-4 rounded-lg border px-4 py-3 text-left transition ${
        disabled
          ? `cursor-not-allowed opacity-55 ${styles.subtle}`
          : active
            ? styles.active
            : `${styles.subtle} ${styles.subtleHover}`
      }`}
    >
      <span className="min-w-0">
        <span className={`block truncate text-sm font-semibold ${styles.text}`}>
          {title}
        </span>
        <span className={`mt-0.5 block text-xs ${styles.muted}`}>
          {subtitle}
        </span>
      </span>
      <span
        className={`flex h-6 min-w-6 items-center justify-center rounded-full text-xs ${
          active
            ? "bg-[#3157f6] text-white"
            : "bg-current/10 text-current/55"
        }`}
      >
        {disabled ? (
          unavailableLabel ?? "NA"
        ) : active ? (
          <Check className="h-3.5 w-3.5" />
        ) : (
          ""
        )}
      </span>
    </button>
  );
}

function SummaryLine({
  title,
  subtitle,
  value,
  styles,
}: {
  title: string;
  subtitle: string;
  value: string;
  styles: Record<string, string>;
}) {
  return (
    <div className="flex items-start justify-between gap-5">
      <div className="min-w-0">
        <p className={`truncate text-sm font-semibold ${styles.text}`}>{title}</p>
        <p className={`mt-1 text-xs ${styles.muted}`}>{subtitle}</p>
      </div>
      <p className={`shrink-0 text-sm font-semibold ${styles.text}`}>{value}</p>
    </div>
  );
}

function SummaryTotal({
  label,
  value,
  strong = false,
  styles,
}: {
  label: string;
  value: string;
  strong?: boolean;
  styles: Record<string, string>;
}) {
  return (
    <div className="flex items-center justify-between">
      <span className={strong ? `font-semibold ${styles.text}` : `text-sm ${styles.muted}`}>
        {label}
      </span>
      <span
        className={
          strong
            ? "text-lg font-semibold text-[#3157f6]"
            : `text-sm font-semibold ${styles.text}`
        }
      >
        {value}
      </span>
    </div>
  );
}

function SkeletonRows({ styles }: { styles: Record<string, string> }) {
  return (
    <div className="space-y-2">
      {[0, 1].map((index) => (
        <div
          key={index}
          className={`h-14 animate-pulse rounded-lg border ${styles.subtle}`}
        />
      ))}
    </div>
  );
}

function StateRow({
  message,
  kind = "empty",
  onRetry,
  styles,
}: {
  message: string;
  kind?: "empty" | "error";
  onRetry?: () => void;
  styles: Record<string, string>;
}) {
  if (kind === "error") {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-red-400/30 bg-red-500/10 px-4 py-3 text-sm text-red-500">
        <span>{message}</span>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex items-center gap-1.5 rounded-md bg-red-500/10 px-2.5 py-1 text-xs font-semibold transition hover:bg-red-500/15"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
      </div>
    );
  }

  return (
    <div className={`rounded-lg border border-dashed px-4 py-5 text-center text-sm ${styles.border} ${styles.muted}`}>
      {message}
    </div>
  );
}
