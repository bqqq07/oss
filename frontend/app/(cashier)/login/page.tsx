"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { login, getCurrentShift, tokenStorage } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const usernameRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    // If already logged in with open shift, go to POS
    if (tokenStorage.getAccess()) {
      getCurrentShift().then((shift) => {
        if (shift?.status === "open") {
          router.replace("/cashier/pos");
        } else if (shift) {
          router.replace("/cashier/shift/open");
        }
      });
    }
    usernameRef.current?.focus();
  }, [router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login({ username, password });
      const shift = await getCurrentShift();
      if (shift?.status === "open") {
        router.replace("/cashier/pos");
      } else {
        router.replace("/cashier/shift/open");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "خطأ في تسجيل الدخول");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 to-blue-700 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-8">
        <div className="text-center mb-8">
          <div className="text-5xl mb-3">🛒</div>
          <h1 className="text-2xl font-bold text-gray-800">نظام نقطة البيع</h1>
          <p className="text-gray-500 text-sm mt-1">تسجيل دخول الكاشير</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              اسم المستخدم
            </label>
            <input
              ref={usernameRef}
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="input text-lg"
              placeholder="أدخل اسم المستخدم"
              autoComplete="username"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              كلمة المرور
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input text-lg"
              placeholder="••••••••"
              autoComplete="current-password"
              required
            />
          </div>

          {error && (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full text-lg py-3 mt-2"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <span className="animate-spin">⏳</span> جارٍ الدخول...
              </span>
            ) : (
              "دخول"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
