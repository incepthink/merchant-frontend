"use client";

import React, { useState, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import axiosInstance from "@/utils/axios";
import Cookies from "js-cookie";
import { notifyPromise, notifyResolve } from "@/utils/notify";
const Login = () => {
  const router = useRouter();

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const handleInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm((prev) => ({ ...prev, [name]: value }));
  };

  const isFormValid = loginForm.email && loginForm.password;

  const handleLogin = async () => {
    const notifyId = notifyPromise("Logging in, please hold on...", "info");
    try {
      const response = await axiosInstance.post("/auth/merchant/user/login", {
        email: loginForm.email,
        password: loginForm.password,
      });

      const session = { ...response.data.data };
      if (!session.merchant_id) {
        const merchantsResponse = await axiosInstance.get("/platform/merchant");
        const activeMerchant = merchantsResponse.data.data.find(
          (merchant: { id: number; status: string }) =>
            merchant.status === "active",
        );

        if (!activeMerchant?.id) {
          throw new Error("No active merchant is available for this account");
        }

        session.merchant_id = activeMerchant.id;
      }

      Cookies.set(
        "merchant_user",
        JSON.stringify(session),
        {
          expires: new Date(Date.now() + 4 * 60 * 60 * 1000),
        },
      );

      notifyResolve(notifyId, "Login successful! Redirecting...", "success");

      setTimeout(() => {
        router.push("/");
      }, 1000);
    } catch (error: any) {
      const status = error?.response?.status;
      const apiMessage = error?.response?.data?.message;
      const message =
        apiMessage ||
        (status === 404
          ? "User not found"
          : status === 401
            ? "Invalid password"
            : "Login failed");
      notifyResolve(notifyId, message, "error");
    }
  };

  return (
    <div className="flex justify-center items-center gap-4 lg:gap-8 w-full h-screen font-quantico">
      <div className="flex flex-col justify-center items-start gap-4 px-4 w-full lg:w-1/2 h-full">
        <h2 className="text-4xl font-bold mx-auto mb-8">Login</h2>

        <div className="space-y-2 w-full">
          <label htmlFor="email" className="text-lg">
            Email: <span className="text-red-500">*</span>
          </label>
          <input
            type="email"
            name="email"
            className="border border-[#2D3748] px-4 py-2 w-full outline-none rounded"
            placeholder="Enter email..."
            value={loginForm.email}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="space-y-2 w-full">
          <label htmlFor="password" className="text-lg">
            Password: <span className="text-red-500">*</span>
          </label>
          <input
            type="password"
            name="password"
            className="border border-[#2D3748] px-4 py-2 w-full outline-none rounded"
            placeholder="Enter password..."
            value={loginForm.password}
            onChange={handleInputChange}
            required
          />
        </div>

        <div className="text-sm text-blue-500 flex flex-col">
          <Link href="/signin" className="mt-2">
            New User? Sign up
          </Link>
        </div>

        <div className="flex gap-5 w-full lg:w-1/4">
          <button
            type="button"
            className={`text-[#E6FFFA] text-lg px-6 py-2 rounded w-full transition-colors ${
              isFormValid
                ? "bg-[#2979FF] cursor-pointer"
                : "bg-gray-400 cursor-not-allowed"
            }`}
            onClick={handleLogin}
            disabled={!isFormValid}
          >
            Login
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
