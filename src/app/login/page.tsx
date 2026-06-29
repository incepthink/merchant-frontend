"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import Cookies from "js-cookie";
import { ArrowRight, Lock, Mail } from "lucide-react";
import axiosInstance from "@/utils/axios";
import { notifyPromise, notifyResolve } from "@/utils/notify";
import { AuthLayout } from "@/components/customer/AuthLayout";
import { Field, PrimaryAction } from "@/components/customer/Primitives";

export default function Login() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [submitting, setSubmitting] = useState(false);
  const isValid = Boolean(form.email && form.password);

  const handleLogin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    const notifyId = notifyPromise("Logging in, please hold on...", "info");
    try {
      const response = await axiosInstance.post("/auth/merchant/user/login", form);
      const session = { ...response.data.data };
      if (!session.merchant_id) {
        const merchantsResponse = await axiosInstance.get("/platform/merchant");
        const activeMerchant = merchantsResponse.data.data.find((merchant: { id: number; status: string }) => merchant.status === "active");
        if (!activeMerchant?.id) throw new Error("No active merchant is available for this account");
        session.merchant_id = activeMerchant.id;
      }
      Cookies.set("merchant_user", JSON.stringify(session), { expires: new Date(Date.now() + 4 * 60 * 60 * 1000) });
      notifyResolve(notifyId, "Login successful! Redirecting...", "success");
      window.setTimeout(() => router.push("/"), 1000);
    } catch (error: any) {
      const status = error?.response?.status;
      const message = error?.response?.data?.message || (status === 404 ? "User not found" : status === 401 ? "Invalid password" : "Login failed");
      notifyResolve(notifyId, message, "error");
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Login" subtitle="Sign in to access your loyalty account." footer={<p className="text-sm text-text-secondary">New user? <Link href="/signin" className="text-text-primary underline-offset-4 hover:underline">Sign up</Link></p>}>
      <form onSubmit={handleLogin} className="space-y-4">
        <Field label="Email" name="email" type="email" autoComplete="email" placeholder="you@domain.com" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} trailing={<Mail className="size-4 text-text-muted" aria-hidden />} required />
        <Field label="Password" name="password" type="password" autoComplete="current-password" placeholder="••••••••" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} trailing={<Lock className="size-4 text-text-muted" aria-hidden />} required />
        <PrimaryAction fullWidth loading={submitting} disabled={!isValid} type="submit">{submitting ? "Signing in…" : "Login"}{!submitting && <ArrowRight className="size-4" aria-hidden />}</PrimaryAction>
      </form>
    </AuthLayout>
  );
}
