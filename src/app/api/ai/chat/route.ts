import { NextRequest, NextResponse } from "next/server";
import { AI_ENDPOINTS } from "@/lib/ai-adapter";
import { AIChatRequestPayload, AIChatResponsePayload } from "@/types/warcoffe";

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as AIChatRequestPayload;
    const aiServiceUrl =
      process.env.AI_SERVICE_URL?.trim() ||
      process.env.NEXT_PUBLIC_AI_SERVICE_URL?.trim() ||
      "";

    if (!body.question || body.question.trim().length === 0) {
      return NextResponse.json<AIChatResponsePayload>(
        {
          status: "ERROR",
          answer: "Pertanyaan tidak boleh kosong.",
          error_code: "EMPTY_QUESTION",
        },
        { status: 400 }
      );
    }

    if (!aiServiceUrl) {
      return NextResponse.json<AIChatResponsePayload>(
        {
          status: "SERVICE_UNAVAILABLE",
          answer:
            "Endpoint AI_SERVICE_URL belum dikonfigurasi pada environment variables. Modul ini adalah placeholder integrasi untuk layanan FastAPI tim Next-Gen AI Engineer (AE). Selama layanan AI belum aktif, Anda tetap dapat memantau ringkasan omzet, pengeluaran, dan menu terlaris pada halaman Dashboard dan Laporan.",
          error_code: "AI_SERVICE_URL_NOT_SET",
        },
        { status: 503 }
      );
    }

    const targetUrl = `${aiServiceUrl.replace(/\/$/, "")}${AI_ENDPOINTS.BUSINESS_CHAT}`;

    const upstreamRes = await fetch(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(12000),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json<AIChatResponsePayload>(
        {
          status: "SERVICE_UNAVAILABLE",
          answer: `Layanan FastAPI AI Engineer di ${targetUrl} mengembalikan status HTTP ${upstreamRes.status}. Silakan periksa server FastAPI atau kuota LLM API.`,
          error_code: `UPSTREAM_HTTP_${upstreamRes.status}`,
        },
        { status: 502 }
      );
    }

    const data = (await upstreamRes.json()) as AIChatResponsePayload;
    return NextResponse.json(data);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    return NextResponse.json<AIChatResponsePayload>(
      {
        status: "SERVICE_UNAVAILABLE",
        answer: `Tidak dapat terhubung ke layanan FastAPI AI Engineer (${msg}). Pastikan server FastAPI berjalan pada AI_SERVICE_URL. Seluruh fitur pencatatan manual dan laporan bulanan tetap berfungsi penuh.`,
        error_code: "FASTAPI_CONNECTION_REFUSED",
      },
      { status: 503 }
    );
  }
}
