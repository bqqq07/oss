'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import axios from 'axios';
import { setTokens } from '@/lib/api';
import { saveUser } from '@/lib/auth';
import { User, AuthTokens } from '@/types';
import { Suspense } from 'react';

interface LoginForm {
  username: string;
  password: string;
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get('redirect') ?? '/admin';

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginForm>();

  const onSubmit = async (data: LoginForm) => {
    setLoading(true);
    setError(null);
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:8000/api';
    try {
      // 1. Get JWT tokens
      const { data: tokens } = await axios.post<AuthTokens>(`${BASE_URL}/auth/token/`, data);
      setTokens(tokens.access, tokens.refresh);

      // 2. Fetch user info
      const { data: user } = await axios.get<User>(`${BASE_URL}/auth/me/`, {
        headers: { Authorization: `Bearer ${tokens.access}` },
      });
      saveUser(user);

      router.push(redirect);
    } catch {
      setError('اسم المستخدم أو كلمة المرور غير صحيحة');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" dir="rtl">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">اسم المستخدم</label>
        <input
          {...register('username', { required: 'اسم المستخدم مطلوب' })}
          autoComplete="username"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {errors.username && <p className="text-red-500 text-xs mt-1">{errors.username.message}</p>}
      </div>
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">كلمة المرور</label>
        <input
          type="password"
          {...register('password', { required: 'كلمة المرور مطلوبة' })}
          autoComplete="current-password"
          className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300"
        />
        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm text-center">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading}
        className="w-full py-2.5 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition font-medium disabled:opacity-60"
      >
        {loading ? 'جارٍ تسجيل الدخول...' : 'تسجيل الدخول'}
      </button>
    </form>
  );
}

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center" dir="rtl">
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-8 w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">لوحة الإدارة</h1>
          <p className="text-gray-500 text-sm mt-1">نظام POS – عناية</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
      </div>
    </div>
  );
}
