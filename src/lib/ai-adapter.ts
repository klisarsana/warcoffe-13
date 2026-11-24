// ============================================================================
// WARCOFFE 13 — NEXT-GEN AI ENGINEER (AE) & DATA SCIENCE (DS) SERVICE ADAPTER
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// PENTING (Sesuai Instruksi Master Prompt Bagian H):
// - Modul ini HANYA menyediakan kontrak interface & HTTP client adapter bersih
//   menuju layanan FastAPI yang dikembangkan oleh tim Next-Gen AI Engineer
//   (Muchlis & Rajiv) dan Data Science (Pujha).
// - TIDAK mengimplementasikan LLM lokal, prompt engine palsu, atau berpura-pura
//   memberikan jawaban AI palsu jika layanan AI_SERVICE_URL tidak aktif.
// - Seluruh hasil ekstraksi teks ke transaksi ditampilkan sebagai DRAFT dan
//   WAJIB dikonfirmasi oleh pemilik sebelum disimpan ke database.
// ============================================================================

import {
  AIChatRequestPayload,
  AIChatResponsePayload,
  AIMultiTransactionDraftResponse,
  AITransactionDraftResponse,
} from "@/types/warcoffe";

export const AI_ENDPOINTS = {
  PARSE_TRANSACTION: "/api/v1/parse-transaction",
  PARSE_TRANSACTIONS: "/api/v1/parse-transactions",
  BUSINESS_CHAT: "/api/v1/chat",
  HEALTH_CHECK: "/api/v1/health",
} as const;

export function getConfiguredAIServiceUrl(): string {
  return (
    process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim() ||
    process.env.AI_SERVICE_URL?.trim() ||
    ""
  );
}

/**
 * Mengirim teks bahasa sehari-hari (contoh: "beli kopi hitam 2, indomie telur 1")
 * ke proxy route `/api/ai/parse-transaction` yang meneruskan ke FastAPI `AI_SERVICE_URL`.
 */
export async function requestTransactionDraftFromText(params: {
  rawText: string;
  availableMenuNames: string[];
}): Promise<AITransactionDraftResponse> {
  if (!params.rawText || params.rawText.trim().length === 0) {
    return {
      status: "INCOMPLETE",
      draft_type: "UNKNOWN",
      predicted_category: "-",
      transaction_date: new Date().toISOString().slice(0, 10),
      items: [],
      total_amount: null,
      missing_fields: ["raw_text"],
      assistant_message: "Teks input tidak boleh kosong. Masukkan kalimat transaksi terlebih dahulu.",
      requires_owner_confirmation: true,
    };
  }

  try {
    const response = await fetch("/api/ai/parse-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: params.rawText.trim(),
        menu_catalog_hints: params.availableMenuNames,
      }),
    });

    const data = (await response.json()) as AITransactionDraftResponse;
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      status: "SERVICE_UNAVAILABLE",
      draft_type: "UNKNOWN",
      predicted_category: "-",
      transaction_date: new Date().toISOString().slice(0, 10),
      items: [],
      total_amount: null,
      missing_fields: [],
      assistant_message: `Layanan FastAPI AI Engineer belum terhubung (${message}). Silakan gunakan pencatatan manual di menu Kasir (POS) atau Pengeluaran.`,
      requires_owner_confirmation: true,
    };
  }
}

function multiDraftUnavailable(message: string): AIMultiTransactionDraftResponse {
  return {
    status: "SERVICE_UNAVAILABLE",
    drafts: [],
    assistant_message: message,
    requires_owner_confirmation: true,
  };
}

/**
 * Mengirim satu atau beberapa baris transaksi bertanggal ke endpoint plural
 * `/api/ai/parse-transactions`. Setiap tanggal menghasilkan draft terpisah,
 * sedangkan tanggal dan jenis transaksi yang sama digabung oleh service AI.
 */
export async function requestTransactionDraftsFromText(params: {
  rawText: string;
  availableMenuNames: string[];
}): Promise<AIMultiTransactionDraftResponse> {
  if (!params.rawText || params.rawText.trim().length === 0) {
    return {
      status: "INCOMPLETE",
      drafts: [],
      assistant_message:
        "Teks input tidak boleh kosong. Masukkan kalimat transaksi terlebih dahulu.",
      requires_owner_confirmation: true,
    };
  }

  try {
    const response = await fetch("/api/ai/parse-transactions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: params.rawText.trim(),
        menu_catalog_hints: params.availableMenuNames,
      }),
    });

    const data = (await response.json()) as AIMultiTransactionDraftResponse;
    return {
      ...data,
      drafts: Array.isArray(data.drafts) ? data.drafts : [],
      requires_owner_confirmation: true,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return multiDraftUnavailable(
      `Layanan FastAPI AI Engineer belum terhubung (${message}). Silakan gunakan pencatatan manual di menu Kasir (POS) atau Pengeluaran.`
    );
  }
}

/**
 * Mengirim pertanyaan pemilik ke AI Business Assistant via `/api/ai/chat`
 * yang meneruskan request ke FastAPI `AI_SERVICE_URL/api/v1/chat`.
 */
export async function sendBusinessAssistantQuestion(
  payload: AIChatRequestPayload
): Promise<AIChatResponsePayload> {
  try {
    const response = await fetch("/api/ai/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const data = (await response.json()) as AIChatResponsePayload;
    return data;
  } catch (err) {
    const message = err instanceof Error ? err.message : "Network error";
    return {
      status: "SERVICE_UNAVAILABLE",
      answer: `Layanan AI Business Assistant (FastAPI) tidak dapat dihubungi (${message}). Pastikan variabel environment AI_SERVICE_URL telah diatur dan server FastAPI sedang berjalan. Anda tetap dapat melihat seluruh data omzet, pengeluaran, dan menu terlaris secara langsung di halaman Dashboard dan Laporan.`,
      error_code: "FASTAPI_UNREACHABLE",
    };
  }
}
