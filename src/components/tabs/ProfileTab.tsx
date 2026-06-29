"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Cookies from "js-cookie";
import { Calendar, Mail, Phone, Shield, User as UserIcon } from "lucide-react";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import { getMerchantSession, type MerchantSession } from "@/utils/merchantSession";
import { ErrorState, LuxurySurface, PrimaryAction, SkeletonSurface } from "@/components/customer/Primitives";

type ProfileSummary = { balance: number; enrolled_at: string; total_points_earned: number; current_tier?: { name: string } | null };

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
    if (!session || !selectedMerchantId) { router.push("/login"); return; }
    setUser({ ...session, merchant_id: selectedMerchantId });
    setLoading(true);
    setError(false);
    try {
      const response = await axiosInstance.get("/user/merchant/points", { params: { user_id: session.id, merchant_id: selectedMerchantId } });
      setSummary(response.data.data);
    } catch { setError(true); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchProfile(); }, [merchantId]);

  const logout = () => {
    ["owner_id", "owner_cap_id", "jwt", "api_key", "merchant_user"].forEach((key) => Cookies.remove(key));
    window.location.href = "/login";
  };

  if (loading) return <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]"><SkeletonSurface className="h-72" /><SkeletonSurface className="h-72" /></div>;
  if (error || !user) return <ErrorState title="Profile unavailable" description="Failed to load your profile." onRetry={fetchProfile} />;

  const enrolledDate = summary?.enrolled_at ? new Date(summary.enrolled_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "Not enrolled";
  return (
    <div>
      <header className="mb-6 grid grid-cols-[minmax(0,1fr)_auto] items-end gap-3"><div className="min-w-0"><h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Profile</h1><p className="mt-1 text-sm text-text-secondary">Your customer and loyalty membership details.</p></div><PrimaryAction variant="secondary" onClick={logout}>Sign out</PrimaryAction></header>
      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <LuxurySurface className="flex flex-col items-center text-center"><div className="grid size-20 place-items-center rounded-3xl gradient-card text-2xl font-semibold text-white">{(user.name ?? "M").slice(0, 1).toUpperCase()}</div><h2 className="mt-4 text-xl font-medium tracking-tight">{user.name ?? "Member"}</h2><p className="mt-1 text-sm text-text-secondary">Member #{user.id}</p><div className="mt-5 inline-flex items-center gap-1.5 rounded-full surface-2 px-3 py-1 text-xs text-text-secondary"><Shield className="size-3.5 text-accent-coral" aria-hidden />{summary?.current_tier?.name ?? "Member"} tier</div></LuxurySurface>
        <LuxurySurface><h2 className="text-base font-medium">Contact</h2><ul className="mt-4 space-y-1 text-sm"><Row icon={UserIcon} label="Name" value={user.name} /><Row icon={Mail} label="Email" value={user.email} /><Row icon={Phone} label="Phone" value={user.phone} /><Row icon={Calendar} label="Member since" value={enrolledDate} /></ul><div className="mt-6 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-border-subtle"><Mini label="Available" value={`${summary?.balance?.toLocaleString() ?? 0} pts`} /><Mini label="Lifetime earned" value={`${summary?.total_points_earned?.toLocaleString() ?? 0} pts`} /></div></LuxurySurface>
      </div>
    </div>
  );
}

function Row({ icon: Icon, label, value }: { icon: React.ComponentType<{ className?: string }>; label: string; value?: string }) {
  return <li className="grid grid-cols-[auto_minmax(0,1fr)_auto] items-center gap-3 border-b border-border-subtle py-3 last:border-0"><Icon className="size-4 text-text-muted" aria-hidden /><span className="text-text-muted">{label}</span><span className="truncate text-text-primary">{value ?? "—"}</span></li>;
}
function Mini({ label, value }: { label: string; value: string }) {
  return <div className="surface-1 p-4"><div className="text-xs uppercase tracking-[0.12em] text-text-muted">{label}</div><div className="mt-1.5 text-lg font-medium tnum">{value}</div></div>;
}
