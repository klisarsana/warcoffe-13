"use client";

import React, { useMemo, useState } from "react";
import Link from "next/link";
import {
  Bot,
  Send,
  Sparkles,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  Server,
  Code2,
  ArrowRight,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import {
  AIChatMessage,
  AITransactionDraftResponse,
  CartItem,
} from "@/types/warcoffe";
import {
  AI_ENDPOINTS,
  getConfiguredAIServiceUrl,
  requestTransactionDraftFromText,
  sendBusinessAssistantQuestion,
} from "@/lib/ai-adapter";
import {
  calculateMonthlySummary,
  getLowStockMenuItems,
} from "@/lib/calculations";
import { formatIDR, getCurrentMonthKey, getLocalDateKey } from "@/lib/format";
import { EXPENSE_CATEGORIES } from "@/lib/menu-seed-data";

const SUGGESTED_QUESTIONS = [
  "Berapa omzet bulan ini?",
  "Menu apa yang paling laris?",
  "Bagaimana tren penjualan minggu ini?",
  "Berapa total pengeluaran bulan ini?",
];

export default function AIAssistantPage() {
  const {
    menuItems,
    categories,
    transactions,
    expenses,
    createSaleTransaction,
    createExpense,
  } = useWarcoffe();

  const [activeTab, setActiveTab] = useState<"CHAT" | "TEXT_DRAFT" | "CONTRACT">(
    "CHAT"
  );

  // Chat state
  const [messages, setMessages] = useState<AIChatMessage[]>([]);
  const [chatInput, setChatInput] = useState<string>("");
  const [isChatLoading, setIsChatLoading] = useState<boolean>(false);

  // Text-to-Transaction Draft state
  const [rawDraftText, setRawDraftText] = useState<string>("");
  const [isParsingDraft, setIsParsingDraft] = useState<boolean>(false);
  const [draftResult, setDraftResult] =
    useState<AITransactionDraftResponse | null>(null);
  const [draftConfirmationNotice, setDraftConfirmationNotice] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);

  const currentMonth = getCurrentMonthKey();

  const monthlySummary = useMemo(
    () =>
      calculateMonthlySummary({
        transactions,
        expenses,
        monthKey: currentMonth,
      }),
    [transactions, expenses, currentMonth]
  );

  const lowStockItems = useMemo(
    () => getLowStockMenuItems(menuItems),
    [menuItems]
  );

  const categoryNameMap = useMemo(() => {
    const m = new Map<string, string>();
    categories.forEach((c) => m.set(c.id, c.name));
    return m;
  }, [categories]);

  const handleSendQuestion = async (questionText: string) => {
    const trimmed = questionText.trim();
    if (!trimmed || isChatLoading) return;

    const userMsg: AIChatMessage = {
      id: `msg-${Date.now()}-user`,
      role: "user",
      content: trimmed,
      created_at: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    setChatInput("");
    setIsChatLoading(true);

    const response = await sendBusinessAssistantQuestion({
      question: trimmed,
      context_summary: {
        current_month: currentMonth,
        monthly_revenue: monthlySummary.monthly_revenue,
        monthly_expenses: monthlySummary.monthly_expenses,
        net_difference: monthlySummary.net_difference,
        transaction_count: monthlySummary.monthly_transaction_count,
        top_selling_items: monthlySummary.top_selling_menus
          .slice(0, 5)
          .map((m) => ({
            name: m.menu_name,
            qty: m.total_quantity_sold,
            revenue: m.total_revenue,
          })),
        low_stock_items: lowStockItems.map((i) => ({
          name: i.name,
          current_stock: i.current_stock ?? 0,
          min_threshold: i.min_stock_threshold ?? 5,
        })),
      },
    });

    const assistantMsg: AIChatMessage = {
      id: `msg-${Date.now()}-assistant`,
      role: "assistant",
      content: response.answer,
      created_at: new Date().toISOString(),
      is_error:
        response.status === "SERVICE_UNAVAILABLE" || response.status === "ERROR",
      metadata: {
        endpoint: AI_ENDPOINTS.BUSINESS_CHAT,
        service_status: response.status,
      },
    };

    setMessages((prev) => [...prev, assistantMsg]);
    setIsChatLoading(false);
  };

  const handleParseTextDraft = async (e: React.FormEvent) => {
    e.preventDefault();
    setDraftConfirmationNotice(null);
    setIsParsingDraft(true);

    const res = await requestTransactionDraftFromText({
      rawText: rawDraftText,
      availableMenuNames: menuItems.map((m) => m.name),
    });

    setDraftResult(res);
    setIsParsingDraft(false);
  };

  const handleConfirmAndSaveDraft = async () => {
    if (!draftResult) return;

    if (draftResult.draft_type === "EXPENSE") {
      const amount = draftResult.total_amount ?? 0;
      const res = await createExpense({
        expense_date: draftResult.transaction_date || getLocalDateKey(),
        description:
          draftResult.expense_description ||
          rawDraftText.trim() ||
          "Pengeluaran Draft AI",
        category: EXPENSE_CATEGORIES.includes(draftResult.predicted_category)
          ? draftResult.predicted_category
          : "Bahan Baku & Kemasan",
        amount,
        note: "Dikonfirmasi pemilik dari draft AI Assistant",
        source: "AI_DRAFT_CONFIRMED",
      });

      if (!res.ok) {
        setDraftConfirmationNotice({
          type: "error",
          text: (res.errors || ["Gagal menyimpan draft pengeluaran."]).join(" "),
        });
        return;
      }

      setDraftResult(null);
      setRawDraftText("");
      setDraftConfirmationNotice({
        type: "success",
        text: "Draft pengeluaran telah dikonfirmasi pemilik dan disimpan ke database.",
      });
      return;
    }

    if (draftResult.draft_type === "INCOME_SALE") {
      const cartItems: CartItem[] = draftResult.items.map((item, idx) => {
        const matchedMenu = menuItems.find(
          (m) =>
            m.id === item.matched_menu_item_id ||
            m.name.toLowerCase() === item.item_name.toLowerCase()
        );
        const unitPrice =
          item.unit_price ??
          matchedMenu?.default_price ??
          matchedMenu?.hot_price ??
          0;
        return {
          cart_item_id: `ai-draft-${idx}`,
          menu_item_id: matchedMenu?.id || `custom-${idx}`,
          menu_name: matchedMenu?.name || item.item_name,
          category_id: matchedMenu?.category_id || "cat-racikan",
          category_name:
            (matchedMenu && categoryNameMap.get(matchedMenu.category_id)) ||
            draftResult.predicted_category ||
            "Penjualan",
          variant_key: "DEFAULT",
          variant_label: item.variant_label || "Standar",
          unit_price: unitPrice,
          quantity: item.quantity,
          line_total: unitPrice * item.quantity,
        };
      });

      const total = cartItems.reduce((s, i) => s + i.line_total, 0);
      const res = await createSaleTransaction({
        cart: cartItems,
        paymentMethod: "TUNAI",
        amountPaid: total,
        customerNote: "Dikonfirmasi pemilik dari draft teks AI",
        source: "AI_DRAFT_CONFIRMED",
      });

      if (!res.ok) {
        setDraftConfirmationNotice({
          type: "error",
          text: (res.errors || ["Gagal menyimpan draft penjualan."]).join(" "),
        });
        return;
      }

      setDraftResult(null);
      setRawDraftText("");
      setDraftConfirmationNotice({
        type: "success",
        text: "Draft transaksi penjualan telah dikonfirmasi pemilik dan disimpan.",
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Header & Integration Notice */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-espresso-100 text-espresso-800">
            <Bot className="w-3.5 h-3.5 text-caramel-600" />
            Integrasi Layanan FastAPI (Next-Gen AI Engineer & Data Science)
          </span>
          <h1 className="text-2xl font-bold text-espresso-900 mt-1">
            AI Business Assistant & Input Teks Berbantuan AI
          </h1>
          <p className="text-sm text-espresso-600">
            Antarmuka dan service adapter menuju layanan FastAPI (`AI_SERVICE_URL`). Semua draft transaksi AI wajib dikonfirmasi pemilik sebelum disimpan.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/pos"
            className="px-3.5 py-2 rounded-xl border border-espresso-300 bg-white text-espresso-900 text-xs font-bold hover:bg-espresso-50 inline-flex items-center gap-1.5"
          >
            Input Manual Kasir (POS) <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>

      {/* Mode Switch Tabs */}
      <div className="flex flex-wrap gap-2 border-b border-espresso-200 pb-3">
        <button
          type="button"
          onClick={() => setActiveTab("CHAT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition ${
            activeTab === "CHAT"
              ? "bg-espresso-900 text-cream-50 shadow-sm"
              : "bg-white border border-espresso-200 text-espresso-800 hover:bg-espresso-100"
          }`}
        >
          <Bot className="w-4 h-4" />
          1. AI Business Assistant Chat
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("TEXT_DRAFT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition ${
            activeTab === "TEXT_DRAFT"
              ? "bg-espresso-900 text-cream-50 shadow-sm"
              : "bg-white border border-espresso-200 text-espresso-800 hover:bg-espresso-100"
          }`}
        >
          <FileText className="w-4 h-4" />
          2. Input Teks ke Draft Transaksi
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("CONTRACT")}
          className={`px-4 py-2 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition ${
            activeTab === "CONTRACT"
              ? "bg-espresso-900 text-cream-50 shadow-sm"
              : "bg-white border border-espresso-200 text-espresso-800 hover:bg-espresso-100"
          }`}
        >
          <Code2 className="w-4 h-4" />
          3. Kontrak API FastAPI (AE & DS)
        </button>
      </div>

      {/* ==================================================================== */}
      {/* TAB 1: AI BUSINESS ASSISTANT CHAT                                    */}
      {/* ==================================================================== */}
      {activeTab === "CHAT" && (
        <div className="bg-white rounded-2xl border border-espresso-200/80 shadow-sm flex flex-col h-[560px]">
          {/* Top Bar */}
          <div className="p-4 border-b border-espresso-100 flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-espresso-900 text-cream-50 flex items-center justify-center">
                <Bot className="w-4 h-4 text-caramel-400" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-espresso-900">
                  Asisten Bisnis Warcoffe 13
                </h2>
                <p className="text-[11px] text-espresso-500">
                  Endpoint: POST {AI_ENDPOINTS.BUSINESS_CHAT} • Target:{" "}
                  {getConfiguredAIServiceUrl() || "AI_SERVICE_URL (Placeholder)"}
                </p>
              </div>
            </div>
            {messages.length > 0 && (
              <button
                type="button"
                onClick={() => setMessages([])}
                className="text-xs text-espresso-600 hover:text-espresso-900 font-semibold"
              >
                Bersihkan Percakapan
              </button>
            )}
          </div>

          {/* Messages / Empty Conversation State */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto px-4">
                <div className="w-12 h-12 rounded-2xl bg-cream-100 border border-espresso-200 flex items-center justify-center mb-3">
                  <Sparkles className="w-6 h-6 text-caramel-600" />
                </div>
                <h3 className="text-base font-bold text-espresso-900">
                  Belum Ada Percakapan
                </h3>
                <p className="text-xs text-espresso-600 mt-1 leading-relaxed">
                  Tanyakan performa keuangan dan operasional Warcoffe 13 dalam bahasa sehari-hari. Pertanyaan akan dikirim bersama ringkasan metrik data tersimpan ke layanan FastAPI tim Next-Gen AI Engineer.
                </p>

                <div className="mt-5 w-full">
                  <p className="text-[11px] font-bold text-espresso-700 uppercase tracking-wider mb-2.5">
                    Contoh Pertanyaan yang Disarankan:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {SUGGESTED_QUESTIONS.map((q) => (
                      <button
                        key={q}
                        type="button"
                        onClick={() => handleSendQuestion(q)}
                        className="p-3 rounded-xl bg-cream-50 hover:bg-cream-100 border border-espresso-200 text-left text-xs font-semibold text-espresso-900 transition flex items-center justify-between"
                      >
                        <span>&ldquo;{q}&rdquo;</span>
                        <Send className="w-3.5 h-3.5 text-caramel-600 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-xl rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                      msg.role === "user"
                        ? "bg-espresso-900 text-cream-50"
                        : msg.is_error
                        ? "bg-amber-50 border border-amber-300 text-amber-950"
                        : "bg-cream-100 border border-espresso-200 text-espresso-900"
                    }`}
                  >
                    {msg.role === "assistant" && (
                      <div className="flex items-center gap-1.5 font-bold mb-1 text-[11px]">
                        {msg.is_error ? (
                          <>
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                            <span>Status Integrasi Layanan AI</span>
                          </>
                        ) : (
                          <>
                            <Bot className="w-3.5 h-3.5 text-caramel-600" />
                            <span>AI Business Assistant</span>
                          </>
                        )}
                      </div>
                    )}
                    <p className="whitespace-pre-wrap">{msg.content}</p>
                  </div>
                </div>
              ))
            )}

            {isChatLoading && (
              <div className="flex justify-start">
                <div className="bg-cream-100 border border-espresso-200 rounded-2xl px-4 py-3 text-xs text-espresso-800 inline-flex items-center gap-2">
                  <Loader2 className="w-4 h-4 animate-spin text-caramel-600" />
                  <span>Menghubungi layanan FastAPI AI Engineer...</span>
                </div>
              </div>
            )}
          </div>

          {/* Input Box */}
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendQuestion(chatInput);
            }}
            className="p-3.5 border-t border-espresso-100 bg-cream-50/60 flex items-center gap-2"
          >
            <input
              type="text"
              value={chatInput}
              onChange={(e) => setChatInput(e.target.value)}
              placeholder="Ketik pertanyaan seputar omzet, pengeluaran, atau menu terlaris..."
              className="flex-1 px-4 py-2.5 rounded-xl border border-espresso-200 bg-white text-xs focus:outline-none focus:ring-2 focus:ring-caramel-500"
            />
            <button
              type="submit"
              disabled={!chatInput.trim() || isChatLoading}
              className="px-4 py-2.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 disabled:bg-espresso-300 text-cream-50 text-xs font-bold inline-flex items-center gap-1.5 transition"
            >
              <Send className="w-3.5 h-3.5" />
              Kirim
            </button>
          </form>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 2: TEXT-TO-TRANSACTION DRAFT PARSING                             */}
      {/* ==================================================================== */}
      {activeTab === "TEXT_DRAFT" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          <form
            onSubmit={handleParseTextDraft}
            className="lg:col-span-6 bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm space-y-4"
          >
            <div>
              <h2 className="text-base font-bold text-espresso-900">
                Ekstraksi Kalimat Sehari-hari ke Draft Transaksi
              </h2>
              <p className="text-xs text-espresso-600 mt-0.5">
                Mengirim kalimat ke endpoint FastAPI{" "}
                <code>POST {AI_ENDPOINTS.PARSE_TRANSACTION}</code> (LLM API + Model Klasifikasi Kategori).
              </p>
            </div>

            <div>
              <label className="block text-xs font-semibold text-espresso-800 mb-1.5">
                Masukkan Kalimat Transaksi
              </label>
              <textarea
                rows={4}
                value={rawDraftText}
                onChange={(e) => setRawDraftText(e.target.value)}
                placeholder='Contoh: "beli kopi hitam panas 2, indomie telur 1" atau "beli gas elpiji dan es batu Rp35.000"'
                className="w-full p-3 rounded-xl border border-espresso-200 text-xs focus:outline-none focus:ring-2 focus:ring-caramel-500"
              />
            </div>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() =>
                  setRawDraftText("laku Kopi Liong panas 2, Indomie Telur 1")
                }
                className="px-2.5 py-1 rounded-lg bg-cream-100 text-espresso-800 text-[11px] font-medium hover:bg-espresso-100"
              >
                Contoh Penjualan
              </button>
              <button
                type="button"
                onClick={() =>
                  setRawDraftText("beli kopi 1 dus dan gula pasir Rp65000")
                }
                className="px-2.5 py-1 rounded-lg bg-cream-100 text-espresso-800 text-[11px] font-medium hover:bg-espresso-100"
              >
                Contoh Pengeluaran
              </button>
            </div>

            <button
              type="submit"
              disabled={isParsingDraft}
              className="w-full py-2.5 rounded-xl bg-espresso-900 hover:bg-espresso-800 text-cream-50 text-xs font-bold inline-flex items-center justify-center gap-2"
            >
              {isParsingDraft ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Memproses ke Layanan FastAPI...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Buat Draft Transaksi (Perlu Konfirmasi Pemilik)
                </>
              )}
            </button>
          </form>

          {/* Draft Preview & Owner Confirmation Panel */}
          <div className="lg:col-span-6 bg-white rounded-2xl p-5 border border-espresso-200/80 shadow-sm space-y-4">
            <h2 className="text-base font-bold text-espresso-900">
              Pratinjau Draft & Konfirmasi Pemilik
            </h2>

            {draftConfirmationNotice && (
              <div
                className={`p-3.5 rounded-xl border text-xs font-medium ${
                  draftConfirmationNotice.type === "success"
                    ? "bg-emerald-50 border-emerald-300 text-emerald-900"
                    : "bg-rose-50 border-rose-300 text-rose-900"
                }`}
              >
                {draftConfirmationNotice.text}
              </div>
            )}

            {!draftResult ? (
              <div className="py-12 px-4 text-center bg-cream-50 rounded-xl border border-dashed border-espresso-200">
                <FileText className="w-8 h-8 text-espresso-400 mx-auto mb-2" />
                <p className="text-sm font-semibold text-espresso-800">
                  Belum Ada Draft yang Diproses
                </p>
                <p className="text-xs text-espresso-600 mt-1 max-w-sm mx-auto">
                  Hasil ekstraksi dari layanan AI tidak akan pernah langsung disimpan ke database tanpa pemeriksaan dan konfirmasi pemilik di panel ini.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div
                  className={`p-3.5 rounded-xl border ${
                    draftResult.status === "SUCCESS"
                      ? "bg-emerald-50 border-emerald-300 text-emerald-950"
                      : "bg-amber-50 border-amber-300 text-amber-950"
                  }`}
                >
                  <p className="font-bold">
                    Status Layanan AI: {draftResult.status}
                  </p>
                  <p className="mt-1">{draftResult.assistant_message}</p>
                  {draftResult.missing_fields.length > 0 && (
                    <p className="mt-2 font-semibold">
                      Data yang masih kurang:{" "}
                      {draftResult.missing_fields.join(", ")}
                    </p>
                  )}
                </div>

                {draftResult.status === "SUCCESS" && (
                  <div className="p-4 rounded-xl bg-cream-50 border border-espresso-200 space-y-2">
                    <div className="flex justify-between">
                      <span className="text-espresso-600">Jenis Draft:</span>
                      <span className="font-bold">{draftResult.draft_type}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-espresso-600">
                        Prediksi Kategori (Model Klasifikasi):
                      </span>
                      <span className="font-bold">
                        {draftResult.predicted_category}
                      </span>
                    </div>
                    <div className="flex justify-between gap-4">
                      <span className="text-espresso-600">Model Digunakan:</span>
                      <span className="font-semibold text-right">
                        {draftResult.classifier_model_used || "-"}
                      </span>
                    </div>
                    {typeof draftResult.confidence_score === "number" && (
                      <div className="flex justify-between">
                        <span className="text-espresso-600">
                          Confidence Model:
                        </span>
                        <span className="font-bold">
                          {(draftResult.confidence_score * 100).toFixed(1)}%
                        </span>
                      </div>
                    )}
                    {draftResult.expense_description && (
                      <div className="flex justify-between gap-4">
                        <span className="text-espresso-600">
                          Deskripsi Pengeluaran:
                        </span>
                        <span className="font-semibold text-right">
                          {draftResult.expense_description}
                        </span>
                      </div>
                    )}
                    {draftResult.draft_type === "INCOME_SALE" &&
                      draftResult.items.length > 0 && (
                        <div className="pt-2 space-y-1.5">
                          <p className="text-espresso-600 font-semibold">
                            Item Terdeteksi:
                          </p>
                          {draftResult.items.map((item, idx) => (
                            <div
                              key={`${item.item_name}-${idx}`}
                              className="flex justify-between gap-3 rounded-lg bg-white/70 border border-espresso-200 px-3 py-2"
                            >
                              <div>
                                <p className="font-bold text-espresso-900">
                                  {item.quantity}x {item.item_name}
                                </p>
                                <p className="text-[11px] text-espresso-600">
                                  {item.variant_label} · confidence{" "}
                                  {(item.confidence * 100).toFixed(0)}%
                                </p>
                              </div>
                              <span className="font-semibold whitespace-nowrap">
                                {formatIDR(item.line_total)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    <div className="flex justify-between border-t border-espresso-200 pt-2">
                      <span className="text-espresso-600">Estimasi Nominal:</span>
                      <span className="font-bold">
                        {formatIDR(draftResult.total_amount)}
                      </span>
                    </div>

                    <div className="pt-3 flex justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => setDraftResult(null)}
                        className="px-3.5 py-2 rounded-xl border border-espresso-300 font-semibold"
                      >
                        Tolak Draft
                      </button>
                      <button
                        type="button"
                        onClick={handleConfirmAndSaveDraft}
                        className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 font-bold inline-flex items-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        Konfirmasi & Simpan ke Database
                      </button>
                    </div>
                  </div>
                )}

                {draftResult.status !== "SUCCESS" && (
                  <div className="p-3.5 rounded-xl bg-cream-50 border border-espresso-200 flex items-center justify-between">
                    <span className="text-espresso-700">
                      Gunakan pencatatan manual selama layanan FastAPI belum aktif:
                    </span>
                    <div className="flex gap-2">
                      <Link
                        href="/pos"
                        className="px-3 py-1.5 rounded-lg bg-espresso-900 text-cream-50 font-bold"
                      >
                        Ke Kasir (POS)
                      </Link>
                      <Link
                        href="/expenses"
                        className="px-3 py-1.5 rounded-lg border border-espresso-300 text-espresso-900 font-bold"
                      >
                        Ke Pengeluaran
                      </Link>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* TAB 3: DOCUMENTED FASTAPI CONTRACTS FOR AE & DS TEAMS                */}
      {/* ==================================================================== */}
      {activeTab === "CONTRACT" && (
        <div className="bg-white rounded-2xl p-6 border border-espresso-200/80 shadow-sm space-y-5 text-xs">
          <div className="flex items-center gap-2.5 border-b border-espresso-100 pb-3">
            <Server className="w-5 h-5 text-caramel-600" />
            <div>
              <h2 className="text-base font-bold text-espresso-900">
                Spesifikasi Kontrak Integrasi FastAPI (Untuk Tim AE & DS)
              </h2>
              <p className="text-espresso-600">
                Environment Variable: <code>AI_SERVICE_URL=http://localhost:8000</code>
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-espresso-900">
                1. Endpoint Ekstraksi Teks ke Draft Transaksi
              </h3>
              <p className="text-espresso-600">
                <code>POST {"{AI_SERVICE_URL}"}/api/v1/parse-transaction</code>
              </p>
              <pre className="p-3.5 rounded-xl bg-espresso-950 text-cream-100 overflow-x-auto text-[11px] leading-relaxed">
{`// Request Body dari Next.js Web App:
{
  "text": "beli kopi hitam 2, es teh manis 1",
  "menu_catalog_hints": ["Kopi Hitam", "Teh Manis", "..."]
}

// Expected Response Body dari FastAPI (AE/DS):
{
  "status": "SUCCESS", // "SUCCESS" | "INCOMPLETE" | "OUT_OF_CONTEXT" | "SERVICE_UNAVAILABLE"
  "draft_type": "INCOME_SALE", // "INCOME_SALE" | "EXPENSE" | "UNKNOWN"
  "predicted_category": "Minuman Racikan / Sachet",
  "classifier_model_used": "TF-IDF (word + char n-gram) + Logistic Regression",
  "confidence_score": 0.97,
  "transaction_date": "2026-11-20",
  "items": [
    {
      "raw_item_text": "kopi hitam 2",
      "matched_menu_item_id": "mr-01",
      "item_name": "Kopi Hitam",
      "variant_label": "Panas",
      "quantity": 2,
      "unit_price": 4000,
      "line_total": 8000,
      "confidence": 0.96
    }
  ],
  "total_amount": 8000,
  "missing_fields": [],
  "assistant_message": "Draft transaksi berhasil diekstrak.",
  "requires_owner_confirmation": true
}`}
              </pre>
            </div>

            <div className="space-y-2">
              <h3 className="font-bold text-sm text-espresso-900">
                2. Endpoint AI Business Assistant Chat
              </h3>
              <p className="text-espresso-600">
                <code>POST {"{AI_SERVICE_URL}"}/api/v1/chat</code>
              </p>
              <pre className="p-3.5 rounded-xl bg-espresso-950 text-cream-100 overflow-x-auto text-[11px] leading-relaxed">
{`// Request Body dari Next.js Web App:
{
  "question": "Menu apa yang paling laris bulan ini?",
  "context_summary": {
    "current_month": "2026-11",
    "monthly_revenue": 125000,
    "monthly_expenses": 45000,
    "net_difference": 80000,
    "transaction_count": 8,
    "top_selling_items": [
      { "name": "Kopi Liong", "qty": 10, "revenue": 50000 }
    ],
    "low_stock_items": []
  }
}

// Expected Response Body dari FastAPI (AE):
{
  "status": "SUCCESS", // "SUCCESS" | "OUT_OF_CONTEXT"
  "answer": "Menu terlaris bulan ini adalah Kopi Liong (10 terjual).",
  "referenced_metrics": ["top_selling_items", "monthly_revenue"]
}`}
              </pre>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
