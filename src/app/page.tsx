"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Cookies from "js-cookie";
import SummaryTab from "@/components/tabs/SummaryTab";
import MyOrdersTab from "@/components/tabs/MyOrdersTab";
import ActivityTab from "@/components/tabs/ActivityTab";
import ProfileTab from "@/components/tabs/ProfileTab";
import axiosInstance from "@/utils/axios";
import { useMerchantStore } from "@/context/merchantStore";
import {
  CustomerAppShell,
  type CustomerTab,
} from "@/components/customer/AppShell";

const TABS = [
  { label: "Summary", value: "summary" },
  { label: "My Orders", value: "my-orders" },
  { label: "Rewards", value: "activity" },
  { label: "Profile", value: "profile" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

function TabContent({ tab }: { tab: TabValue }) {
  switch (tab) {
    case "summary":
      return <SummaryTab />;
    case "my-orders":
      return <MyOrdersTab />;
    case "activity":
      return <ActivityTab />;
    case "profile":
      return <ProfileTab />;
  }
}

function TabsLayout() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const { merchantId, setMerchantId } = useMerchantStore();
  const [sessionReady, setSessionReady] = useState(false);

  useEffect(() => {
    const initializeSession = async () => {
      const raw = Cookies.get("merchant_user");
      if (!raw) {
        router.push("/login");
        return;
      }

      try {
        const user = JSON.parse(raw);
        if (!user?.id) {
          router.push("/login");
          return;
        }

        if (user.merchant_id) {
          setMerchantId(user.merchant_id);
          setSessionReady(true);
          return;
        }

        const res = await axiosInstance.get("/platform/merchant");
        const active = res.data.data.filter(
          (m: { status: string }) => m.status === "active",
        );

        if (!active[0]?.id) {
          router.push("/login");
          return;
        }

        const nextUser = { ...user, merchant_id: active[0].id };
        Cookies.set("merchant_user", JSON.stringify(nextUser), {
          expires: new Date(Date.now() + 4 * 60 * 60 * 1000),
        });
        setMerchantId(active[0].id);
        setSessionReady(true);
      } catch {
        router.push("/login");
      }
    };

    initializeSession();
  }, []);

  const param = searchParams.get("tab") as TabValue | null;
  const activeTab: TabValue = TABS.some((t) => t.value === param)
    ? (param as TabValue)
    : "summary";

  const handleLogout = () => {
    Cookies.remove("owner_id");
    Cookies.remove("owner_cap_id");
    Cookies.remove("jwt");
    Cookies.remove("api_key");
    Cookies.remove("merchant_user");

    window.location.href = "/login";
  };

  if (!sessionReady) {
    return null;
  }

  return (
    <CustomerAppShell
      activeTab={activeTab as CustomerTab}
      merchantId={merchantId}
      onMerchantChange={setMerchantId}
      onTabChange={(tab) => router.push(`?tab=${tab}`)}
      onLogout={handleLogout}
    >
      <TabContent key={merchantId ?? "none"} tab={activeTab} />
    </CustomerAppShell>
  );
}

export default function Home() {
  return (
    <Suspense fallback={null}>
      <TabsLayout />
    </Suspense>
  );
}
