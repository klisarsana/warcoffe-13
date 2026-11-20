import { NextRequest, NextResponse } from "next/server";
import { AI_ENDPOINTS } from "@/lib/ai-adapter";
import { AITransactionDraftResponse } from "@/types/warcoffe";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as {
      text?: string;
      menu_catalog_hints?: string[];
    };

    const rawText = body.text?.trim() || "";
    if (!rawText) {
      return NextResponse.json<AITransactionDraftResponse>(
        {
          status: "INCOMPLETE",
          draft_type: "UNKNOWN",
          predicted_category: "-",
          transaction_date: new Date().toISOString().slice(0, 10),
          items: [],
          total_amount: null,
          missing_fields: ["text"],
          assistant_message: "Kalimat transaksi kosong. Harap masukkan kalimat transaksi.",
          requires_owner_confirmation: true,
        },
        { status: 400 }
      );
    }

    const aiServiceUrl =
      process.env.AI_SERVICE_URL?.trim() ||
      process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim() ||
      "";

    if (!aiServiceUrl) {
      return NextResponse.json<AITransactionDraftResponse>(
        {
          status: "SERVICE_UNAVAILABLE",
          draft_type: "UNKNOWN",
          predicted_category: "-",
          transaction_date: new Date().toISOString().slice(0, 10),
          items: [],
          total_amount: null,
          missing_fields: [],
          assistant_message:
            "AI_SERVICE_URL belum dikonfigurasi. Ekstraksi teks ke draft transaksi membutuhkan layanan FastAPI tim Next-Gen AI Engineer. Silakan catat transaksi secara manual melalui menu Kasir (POS) atau Pengeluaran.",
          requires_owner_confirmation: true,
        },
        { status: 503 }
      );
    }

    const targetUrl = `${aiServiceUrl.replace(/\/$/, "")}${AI_ENDPOINTS.PARSE_TRANSACTION}`;

    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        text: rawText,
        menu_catalog_hints: body.menu_catalog_hints || [],
      }),
      signal: AbortSignal.timeout(12000),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json<AITransactionDraftResponse>(
        {
          status: "SERVICE_UNAVAILABLE",
          draft_type: "UNKNOWN",
          predicted_category: "-",
          transaction_date: new Date().toISOString().slice(0, 10),
          items: [],
          total_amount: null,
          missing_fields: [],
          assistant_message: `Server FastAPI di ${targetUrl} merespons dengan HTTP ${upstreamRes.status}. Silakan gunakan input manual di halaman Kasir (POS) atau Pengeluaran.`,
          requires_owner_confirmation: true,
        },
        { status: 502 }
      );
    }

    const data = (await upstreamRes.json()) as AITransactionDraftResponse;
    return NextResponse.json({
      ...data,
      requires_owner_confirmation: true,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<AITransactionDraftResponse>(
      {
        status: "SERVICE_UNAVAILABLE",
        draft_type: "UNKNOWN",
        predicted_category: "-",
        transaction_date: new Date().toISOString().slice(0, 10),
        items: [],
        total_amount: null,
        missing_fields: [],
        assistant_message: `Layanan FastAPI AI Engineer tidak dapat dihubungi (${msg}). Pencatatan manual di halaman Kasir (POS) dan Pengeluaran tetap dapat digunakan sepenuhnya.`,
        requires_owner_confirmation: true,
      },
      { status: 503 }
    );
  }
}
