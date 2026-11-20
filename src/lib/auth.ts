// ============================================================================
// WARCOFFE 13 — SUPABASE AUTHENTICATION HELPERS (OWNER-ONLY FLOW)
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// Aturan Keamanan:
// 1. Hanya mendukung login pemilik via Supabase Auth (Email & Password).
// 2. Tidak ada registrasi publik (signUp dinonaktifkan pada aplikasi).
// 3. Tidak ada autentikasi palsu (fake auth) atau kredensial yang di-hardcode.
// 4. Jika kredensial Supabase tidak dikonfigurasi, sistem menampilkan
//    status konfigurasi yang jelas dan tidak mengizinkan akses ke data bisnis.
// ============================================================================

import { isSupabaseConfigured, supabaseClient } from "@/lib/supabase";

export interface AuthValidationResult {
  valid: boolean;
  error?: string;
}

export function validateOwnerLoginInput(
  email: string,
  password: string
): AuthValidationResult {
  const trimmedEmail = email.trim();
  if (!trimmedEmail) {
    return { valid: false, error: "Alamat email pemilik wajib diisi." };
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
    return { valid: false, error: "Format alamat email tidak valid." };
  }
  if (!password || password.length === 0) {
    return { valid: false, error: "Kata sandi wajib diisi." };
  }
  return { valid: true };
}

/**
 * Menerjemahkan pesan error Supabase Auth ke Bahasa Indonesia yang ramah bagi pemilik UMKM.
 */
export function translateSupabaseAuthError(rawMessage: string): string {
  const msg = rawMessage.toLowerCase();
  if (
    msg.includes("invalid login credentials") ||
    msg.includes("invalid_credentials") ||
    msg.includes("invalid email or password")
  ) {
    return "Email atau kata sandi salah. Silakan periksa kembali kredensial akun pemilik Warcoffe 13 Anda.";
  }
  if (msg.includes("email not confirmed")) {
    return "Alamat email pemilik belum dikonfirmasi di Supabase Auth.";
  }
  if (msg.includes("too many requests") || msg.includes("rate limit")) {
    return "Terlalu banyak percobaan masuk. Silakan tunggu beberapa saat sebelum mencoba lagi.";
  }
  if (msg.includes("jwt expired") || msg.includes("session_not_found") || msg.includes("refresh_token")) {
    return "Sesi login Anda telah berakhir. Silakan masuk kembali.";
  }
  return `Gagal masuk: ${rawMessage}`;
}

export const PROTECTED_ROUTE_PREFIXES = [
  "/dashboard",
  "/pos",
  "/transactions",
  "/menu",
  "/stock",
  "/expenses",
  "/reports",
  "/ai-assistant",
] as const;

export function isProtectedRoute(pathname: string): boolean {
  return PROTECTED_ROUTE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export async function signInOwnerWithPassword(
  email: string,
  password: string
): Promise<{ ok: boolean; error?: string }> {
  if (!isSupabaseConfigured || !supabaseClient) {
    return {
      ok: false,
      error:
        "Konfigurasi Supabase Auth belum tersedia. Harap atur NEXT_PUBLIC_SUPABASE_URL dan NEXT_PUBLIC_SUPABASE_ANON_KEY terlebih dahulu.",
    };
  }

  const validation = validateOwnerLoginInput(email, password);
  if (!validation.valid) {
    return { ok: false, error: validation.error };
  }

  const { data, error } = await supabaseClient.auth.signInWithPassword({
    email: email.trim(),
    password,
  });

  if (error || !data.session) {
    return {
      ok: false,
      error: translateSupabaseAuthError(
        error?.message || "Sesi tidak dapat dibuat."
      ),
    };
  }

  return { ok: true };
}

export async function signOutOwner(): Promise<void> {
  if (supabaseClient) {
    await supabaseClient.auth.signOut();
  }
}
