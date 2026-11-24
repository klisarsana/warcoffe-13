import { NextRequest, NextResponse } from "next/server";
import { AI_ENDPOINTS } from "@/lib/ai-adapter";
import { AIMultiTransactionDraftResponse } from "@/types/warcoffe";

function errorResponse(
  status: AIMultiTransactionDraftResponse["status"],
  message: string,
  httpStatus: number
) {
  return NextResponse.json<AIMultiTransactionDraftResponse>(
    {
      status,
      drafts: [],
      assistant_message: message,
      requires_owner_confirmation: true,
    },
    { status: httpStatus }
  );
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: string;
      menu_catalog_hints?: string[];
    };

    const rawText = body.text?.trim() || "";
    if (!rawText) {
      return errorResponse(
        "INCOMPLETE",
        "Kalimat transaksi kosong. Harap masukkan kalimat transaksi.",
        400
      );
    }

    const aiServiceUrl =
      process.env.AI_SERVICE_URL?.trim() ||
      process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim() ||
      "";

    if (!aiServiceUrl) {
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        "AI_SERVICE_URL belum dikonfigurasi. Ekstraksi teks ke draft transaksi membutuhkan layanan FastAPI tim Next-Gen AI Engineer. Silakan catat transaksi secara manual melalui menu Kasir (POS) atau Pengeluaran.",
        503
      );
    }

    const targetUrl = `${aiServiceUrl.replace(/\/$/, "")}${AI_ENDPOINTS.PARSE_TRANSACTIONS}`;

    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: rawText,
        menu_catalog_hints: body.menu_catalog_hints || [],
      }),
      signal: AbortSignal.timeout(15000),
    });

    if (!upstreamRes.ok) {
      if (upstreamRes.status === 422) {
        return errorResponse(
          "INCOMPLETE",
          "Format permintaan tidak valid. Pastikan teks tidak kosong dan tidak melebihi 4.000 karakter.",
          400
        );
      }
      return errorResponse(
        "SERVICE_UNAVAILABLE",
        `Server FastAPI di ${targetUrl} merespons dengan HTTP ${upstreamRes.status}. Silakan gunakan input manual di halaman Kasir (POS) atau Pengeluaran.`,
        502
      );
    }

    const data = (await upstreamRes.json()) as AIMultiTransactionDraftResponse;
    return NextResponse.json({
      ...data,
      drafts: Array.isArray(data.drafts) ? data.drafts : [],
      requires_owner_confirmation: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return errorResponse(
      "SERVICE_UNAVAILABLE",
      `Layanan FastAPI AI Engineer tidak dapat dihubungi (${msg}). Pencatatan manual di halaman Kasir (POS) dan Pengeluaran tetap dapat digunakan sepenuhnya.`,
      503
    );
  }
}
