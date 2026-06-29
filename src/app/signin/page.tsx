"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import axiosInstance from "@/utils/axios";
import { notifyPromise, notifyResolve } from "@/utils/notify";
import MerchantDropdown from "@/components/MerchantDropdown";
import { AuthLayout } from "@/components/customer/AuthLayout";
import { Field, PrimaryAction } from "@/components/customer/Primitives";

export default function Signin() {
  const router = useRouter();
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const [merchantId, setMerchantId] = useState<number | "">("");
  const [submitting, setSubmitting] = useState(false);
  const isValid = Boolean(form.name && form.email && form.phone && form.password && merchantId !== "");

  const handleSignin = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!isValid || submitting) return;
    setSubmitting(true);
    const notifyId = notifyPromise("Creating account, please hold on...", "info");
    try {
      await axiosInstance.post("/auth/merchant/user/signin", { ...form, merchant_id: merchantId });
      notifyResolve(notifyId, "Account created successfully! Redirecting to login...", "success");
      window.setTimeout(() => router.push("/login"), 1000);
    } catch (error: any) {
      const message = error?.response?.data?.message || (error?.response?.status === 400 ? "Email or phone already exists" : "Failed to create account");
      notifyResolve(notifyId, message, "error");
      setSubmitting(false);
    }
  };

  return (
    <AuthLayout title="Create account" subtitle="Enter your details and select a merchant." footer={<p className="text-sm text-text-secondary">Already have an account? <Link href="/login" className="text-text-primary underline-offset-4 hover:underline">Login</Link></p>}>
      <form onSubmit={handleSignin} className="space-y-4">
        <Field label="Full name" name="name" autoComplete="name" value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
        <Field label="Email" name="email" type="email" autoComplete="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
        <Field label="Phone" name="phone" type="tel" inputMode="numeric" autoComplete="tel" value={form.phone} onChange={(event) => setForm({ ...form, phone: event.target.value.replace(/\D/g, "") })} required />
        <Field label="Password" name="password" type="password" autoComplete="new-password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
        <div><label className="mb-1.5 block text-xs font-medium uppercase tracking-[0.12em] text-text-muted">Merchant</label><MerchantDropdown value={merchantId} onChange={setMerchantId} /></div>
        <PrimaryAction type="submit" fullWidth loading={submitting} disabled={!isValid}>{submitting ? "Creating account…" : "Create User Account"}{!submitting && <ArrowRight className="size-4" aria-hidden />}</PrimaryAction>
      </form>
    </AuthLayout>
  );
}
