"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Coffee,
  Lock,
  Mail,
  LogIn,
  AlertCircle,
  AlertTriangle,
  ShieldCheck,
  Loader2,
  Database,
} from "lucide-react";
import { useAuth } from "@/context/auth-context";

export default function OwnerLoginPage() {
  const router = useRouter();
  const {
    authStatus,
    isConfigured,
    sessionExpiredNotice,
    clearSessionExpiredNotice,
    loginWithEmailPassword,
  } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (authStatus === "AUTHENTICATED") {
      router.replace("/dashboard");
    }
  }, [authStatus, router]);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    clearSessionExpiredNotice();
    setIsSubmitting(true);

    const result = await loginWithEmailPassword(email, password);
    setIsSubmitting(false);

    if (!result.ok) {
      setErrorMsg(result.error || "Gagal masuk ke sistem.");
      return;
    }

    router.replace("/dashboard");
  };

  if (authStatus === "LOADING" || authStatus === "AUTHENTICATED") {
    return (
      <div className="min-h-screen bg-cream-50 flex flex-col items-center justify-center p-6">
        <div className="flex items-center gap-3 text-espresso-800">
          <Loader2 className="w-6 h-6 animate-spin text-caramel-600" />
          <span className="text-sm font-semibold">
            Memeriksa sesi autentikasi pemilik Warcoffe 13...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-espresso-950 via-espresso-900 to-espresso-800 flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md bg-cream-50 rounded-3xl shadow-2xl border border-espresso-700/40 overflow-hidden">
        {/* Top Branded Header */}
        <div className="bg-espresso-900 text-cream-50 p-6 sm:p-8 text-center border-b border-espresso-800">
          <div className="w-14 h-14 rounded-2xl bg-caramel-500 flex items-center justify-center text-white mx-auto shadow-md mb-3">
            <Coffee className="w-7 h-7" />
          </div>
          <span className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full text-[11px] font-semibold bg-espresso-800 text-caramel-400 border border-espresso-700">
            <ShieldCheck className="w-3.5 h-3.5" />
            Akses Khusus Pemilik Usaha (Owner-Only)
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-cream-50 mt-2">
            Warcoffe 13 Management System
          </h1>
          <p className="text-xs text-espresso-300 mt-1">
            Sistem Pencatatan Keuangan Bulanan & Pemantauan Stok
          </p>
        </div>

        {/* Main Card Body */}
        <div className="p-6 sm:p-8 space-y-5">
          {/* Expired Session Notice */}
          {sessionExpiredNotice && (
            <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-300 text-amber-950 text-xs flex items-start gap-2.5">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-bold">Sesi Berakhir</p>
                <p className="mt-0.5">{sessionExpiredNotice}</p>
              </div>
            </div>
          )}

          {/* Supabase Unconfigured State — No Fake Auth Allowed */}
          {!isConfigured ? (
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-amber-950 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold text-sm text-amber-900">
                  <Database className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Konfigurasi Supabase Auth Diperlukan</span>
                </div>
                <p className="leading-relaxed">
                  Kredensial Supabase belum terdeteksi pada environment variables. Demi keamanan data bisnis Warcoffe 13, sistem <strong>tidak menggunakan autentikasi tiruan (fake auth)</strong> dan tidak mengizinkan akses tanpa sesi Supabase Auth yang sah.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-white border border-espresso-200 text-xs space-y-2 text-espresso-800">
                <p className="font-bold text-espresso-900">
                  Langkah Mengaktifkan Login Pemilik:
                </p>
                <ol className="list-decimal list-inside space-y-1.5 text-[11px] leading-relaxed">
                  <li>
                    Salin file <code>.env.example</code> menjadi{" "}
                    <code>.env.local</code>.
                  </li>
                  <li>
                    Isi variabel <code>NEXT_PUBLIC_SUPABASE_URL</code> dan{" "}
                    <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> dari dashboard project Supabase Anda.
                  </li>
                  <li>
                    Buat 1 akun email & password pemilik di{" "}
                    <strong>Supabase Dashboard → Authentication → Users</strong>{" "}
                    (registrasi publik dinonaktifkan).
                  </li>
                  <li>
                    Jalankan ulang server aplikasi (<code>npm run dev</code>).
                  </li>
                </ol>
              </div>
            </div>
          ) : (
            <form onSubmit={handleLoginSubmit} className="space-y-4">
              {errorMsg && (
                <div
                  role="alert"
                  className="p-3.5 rounded-xl bg-rose-50 border border-rose-300 text-rose-900 text-xs flex items-start gap-2.5"
                >
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label
                  htmlFor="owner-email"
                  className="block text-xs font-bold text-espresso-800 mb-1.5"
                >
                  Email Pemilik Warcoffe 13
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="owner-email"
                    type="email"
                    autoComplete="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="owner@warcoffe13.id"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-espresso-200 bg-white text-sm text-espresso-900 focus:outline-none focus:ring-2 focus:ring-caramel-500"
                  />
                </div>
              </div>

              <div>
                <label
                  htmlFor="owner-password"
                  className="block text-xs font-bold text-espresso-800 mb-1.5"
                >
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-espresso-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    id="owner-password"
                    type="password"
                    autoComplete="current-password"
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Masukkan kata sandi pemilik"
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-espresso-200 bg-white text-sm text-espresso-900 focus:outline-none focus:ring-2 focus:ring-caramel-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 rounded-xl bg-espresso-900 hover:bg-espresso-800 disabled:bg-espresso-400 text-cream-50 font-bold text-sm inline-flex items-center justify-center gap-2 transition shadow-md"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Memverifikasi Kredensial...
                  </>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    Masuk ke Dashboard Pemilik
                  </>
                )}
              </button>
            </form>
          )}

          {/* Footer Note: No Public Registration */}
          <div className="pt-3 border-t border-espresso-200/70 text-center space-y-1">
            <p className="text-[11px] text-espresso-600 font-medium">
              Sistem Internal UMKM Warcoffe 13 • Pendaftaran publik tidak tersedia.
            </p>
            <p className="text-[10px] text-espresso-500">
              Capstone Project Asah 2026 • Tim ID: A26-CS187
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
