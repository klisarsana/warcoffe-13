"use client";

import React, { useMemo, useState } from "react";
import {
  ShieldCheck,
  Search,
  Calendar,
  Eye,
  PlusCircle,
  Pencil,
  Trash2,
  Boxes,
  Sparkles,
  UserCheck,
  Clock,
  X,
  ArrowRightLeft,
} from "lucide-react";
import { useWarcoffe } from "@/context/warcoffe-context";
import {
  AuditActionType,
  AuditEntityType,
  AuditLogRecord,
} from "@/types/warcoffe";
import { formatDateTimeID } from "@/lib/format";

const ENTITY_LABELS: Record<AuditEntityType, string> = {
  SALE_TRANSACTION: "Transaksi Penjualan (POS)",
  EXPENSE: "Pengeluaran Operasional",
  MENU_ITEM: "Katalog Menu",
  CATEGORY: "Kategori Menu",
  STOCK: "Manajemen Stok",
};

const ACTION_LABELS: Record<
  AuditActionType,
  { label: string; badgeClass: string }
> = {
  CREATE: {
    label: "TAMBAH (CREATE)",
    badgeClass: "bg-emerald-100 text-emerald-900 border-emerald-200",
  },
  UPDATE: {
    label: "UBAH (UPDATE)",
    badgeClass: "bg-amber-100 text-amber-950 border-amber-200",
  },
  DELETE: {
    label: "HAPUS (DELETE)",
    badgeClass: "bg-rose-100 text-rose-900 border-rose-200",
  },
  STOCK_MOVE: {
    label: "PERGERAKAN STOK",
    badgeClass: "bg-sky-100 text-sky-900 border-sky-200",
  },
  AI_CONFIRM: {
    label: "KONFIRMASI DRAFT AI",
    badgeClass: "bg-purple-100 text-purple-900 border-purple-200",
  },
};

export default function AuditLogPage() {
  const { auditLogs, isLoading } = useWarcoffe();

  const [filterEntity, setFilterEntity] = useState<"ALL" | AuditEntityType>("ALL");
  const [filterAction, setFilterAction] = useState<"ALL" | AuditActionType>("ALL");
  const [filterDate, setFilterDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modal Before vs After Comparison
  const [selectedLog, setSelectedLog] = useState<AuditLogRecord | null>(null);

  const filteredLogs = useMemo(() => {
    return auditLogs.filter((log) => {
      if (filterEntity !== "ALL" && log.entity_type !== filterEntity) {
        return false;
      }
      if (filterAction !== "ALL" && log.action_type !== filterAction) {
        return false;
      }
      if (filterDate && log.created_at.slice(0, 10) !== filterDate) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const matchSummary = log.summary.toLowerCase().includes(q);
        const matchEntityId = log.entity_id.toLowerCase().includes(q);
        const matchActor = log.actor_email.toLowerCase().includes(q);
        if (!matchSummary && !matchEntityId && !matchActor) return false;
      }
      return true;
    });
  }, [auditLogs, filterEntity, filterAction, filterDate, searchQuery]);

  const stats = useMemo(() => {
    return {
      total: auditLogs.length,
      creates: auditLogs.filter(
        (l) => l.action_type === "CREATE" || l.action_type === "AI_CONFIRM"
      ).length,
      updates: auditLogs.filter(
        (l) => l.action_type === "UPDATE" || l.action_type === "STOCK_MOVE"
      ).length,
      deletes: auditLogs.filter((l) => l.action_type === "DELETE").length,
    };
  }, [auditLogs]);

  const diffKeys = useMemo(() => {
    if (!selectedLog) return [];
    const keys = new Set<string>();
    if (selectedLog.before_data) {
      Object.keys(selectedLog.before_data).forEach((k) => keys.add(k));
    }
    if (selectedLog.after_data) {
      Object.keys(selectedLog.after_data).forEach((k) => keys.add(k));
    }
    return Array.from(keys);
  }, [selectedLog]);

  if (isLoading) {
    return (
      <div className="space-y-6 animate-pulse">
        <div className="h-10 bg-espresso-200/60 rounded-xl w-64" />
        <div className="h-64 bg-espresso-100 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-espresso-100 text-espresso-800">
            <ShieldCheck className="w-3.5 h-3.5 text-caramel-600" />
            Append-Only Security & Activity Trail
          </span>
          <h1 className="text-2xl font-bold text-espresso-900 mt-1">
            Audit Log Aktivitas Pemilik Warcoffe 13
          </h1>
          <p className="text-sm text-espresso-600">
            Rekam jejak otomatis setiap penambahan, perubahan, dan penghapusan transaksi, pengeluaran, menu, dan stok beserta perbandingan nilai lama vs nilai baru.
          </p>
        </div>
      </div>

      {/* Summary Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Total Aktivitas Tercatat
          </span>
          <p className="text-xl font-bold text-espresso-900 mt-1">
            {stats.total} Log
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Penambahan & Konfirmasi AI
          </span>
          <p className="text-xl font-bold text-emerald-700 mt-1">
            {stats.creates} Aktivitas
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Perubahan & Penyesuaian Stok
          </span>
          <p className="text-xl font-bold text-amber-700 mt-1">
            {stats.updates} Aktivitas
          </p>
        </div>
        <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm">
          <span className="text-xs font-medium text-espresso-600">
            Penghapusan Data
          </span>
          <p className="text-xl font-bold text-rose-700 mt-1">
            {stats.deletes} Aktivitas
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white rounded-2xl p-4 border border-espresso-200/80 shadow-sm grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Filter Modul (Entity)
          </label>
          <select
            value={filterEntity}
            onChange={(e) =>
              setFilterEntity(e.target.value as "ALL" | AuditEntityType)
            }
            className="w-full border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900 focus:outline-none"
          >
            <option value="ALL">Semua Modul</option>
            <option value="SALE_TRANSACTION">Transaksi Penjualan (POS)</option>
            <option value="EXPENSE">Pengeluaran Operasional</option>
            <option value="MENU_ITEM">Katalog Menu</option>
            <option value="CATEGORY">Kategori Menu</option>
            <option value="STOCK">Manajemen Stok</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Filter Jenis Aksi
          </label>
          <select
            value={filterAction}
            onChange={(e) =>
              setFilterAction(e.target.value as "ALL" | AuditActionType)
            }
            className="w-full border border-espresso-200 rounded-xl px-3 py-2 text-xs font-semibold text-espresso-900 focus:outline-none"
          >
            <option value="ALL">Semua Jenis Aksi</option>
            <option value="CREATE">Tambah Data (CREATE)</option>
            <option value="UPDATE">Ubah Data (UPDATE)</option>
            <option value="DELETE">Hapus Data (DELETE)</option>
            <option value="STOCK_MOVE">Pergerakan Stok (STOCK_MOVE)</option>
            <option value="AI_CONFIRM">Konfirmasi Draft AI (AI_CONFIRM)</option>
          </select>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Filter Tanggal
          </label>
          <div className="flex items-center gap-2 border border-espresso-200 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-caramel-600 shrink-0" />
            <input
              type="date"
              value={filterDate}
              onChange={(e) => setFilterDate(e.target.value)}
              className="text-xs font-semibold text-espresso-900 w-full focus:outline-none bg-transparent"
            />
            {filterDate && (
              <button
                type="button"
                onClick={() => setFilterDate("")}
                className="text-espresso-400 hover:text-espresso-700"
                title="Reset Tanggal"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-espresso-700 mb-1">
            Cari Ringkasan / ID / Email
          </label>
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-espresso-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Ketik kata kunci..."
              className="w-full pl-8 pr-3 py-2 border border-espresso-200 rounded-xl text-xs focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Timeline / Table */}
      {filteredLogs.length === 0 ? (
        <div className="bg-white rounded-2xl p-12 text-center border border-espresso-200/80 shadow-sm">
          <ShieldCheck className="w-10 h-10 text-espresso-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-espresso-900">
            Belum Ada Catatan Audit Log yang Cocok
          </h3>
          <p className="text-xs text-espresso-600 max-w-md mx-auto mt-1">
            Setiap kali Anda mencatat penjualan di Kasir (POS), menambah/mengubah pengeluaran, mengedit harga menu, atau menyesuaikan stok, jejak auditnya akan otomatis terekam di halaman ini.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-espresso-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                  <th className="py-3 px-4">Waktu</th>
                  <th className="py-3 px-4">Aksi</th>
                  <th className="py-3 px-4">Modul</th>
                  <th className="py-3 px-4">Ringkasan Aktivitas</th>
                  <th className="py-3 px-4">Pelaku (Owner)</th>
                  <th className="py-3 px-4 text-right">Perbandingan Data</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-espresso-100 text-xs">
                {filteredLogs.map((log) => {
                  const actionMeta = ACTION_LABELS[log.action_type] || {
                    label: log.action_type,
                    badgeClass: "bg-espresso-100 text-espresso-800",
                  };

                  return (
                    <tr key={log.id} className="hover:bg-cream-50/70">
                      <td className="py-3 px-4 whitespace-nowrap text-espresso-700 font-medium">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-caramel-600 shrink-0" />
                          {formatDateTimeID(log.created_at)}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${actionMeta.badgeClass}`}
                        >
                          {log.action_type === "CREATE" && (
                            <PlusCircle className="w-3 h-3" />
                          )}
                          {log.action_type === "UPDATE" && (
                            <Pencil className="w-3 h-3" />
                          )}
                          {log.action_type === "DELETE" && (
                            <Trash2 className="w-3 h-3" />
                          )}
                          {log.action_type === "STOCK_MOVE" && (
                            <Boxes className="w-3 h-3" />
                          )}
                          {log.action_type === "AI_CONFIRM" && (
                            <Sparkles className="w-3 h-3" />
                          )}
                          {actionMeta.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-semibold text-espresso-800">
                          {ENTITY_LABELS[log.entity_type] || log.entity_type}
                        </span>
                        <p className="text-[10px] text-espresso-500 font-mono">
                          ID: {log.entity_id}
                        </p>
                      </td>
                      <td className="py-3 px-4 font-medium text-espresso-900 max-w-md">
                        {log.summary}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-espresso-700">
                        <span className="inline-flex items-center gap-1 text-[11px]">
                          <UserCheck className="w-3.5 h-3.5 text-emerald-600" />
                          {log.actor_email}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button
                          type="button"
                          onClick={() => setSelectedLog(log)}
                          className="px-3 py-1.5 rounded-xl border border-espresso-200 bg-cream-50 hover:bg-espresso-900 hover:text-cream-50 text-espresso-900 text-xs font-semibold inline-flex items-center gap-1.5 transition"
                        >
                          <ArrowRightLeft className="w-3.5 h-3.5" />
                          Before / After
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL PERBANDINGAN NILAI LAMA VS BARU (BEFORE / AFTER SNAPSHOT)       */}
      {/* ==================================================================== */}
      {selectedLog && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-3xl w-full p-6 shadow-xl border border-espresso-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-start justify-between border-b border-espresso-100 pb-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-caramel-600">
                  {ENTITY_LABELS[selectedLog.entity_type]} •{" "}
                  {ACTION_LABELS[selectedLog.action_type]?.label}
                </span>
                <h3 className="text-base font-bold text-espresso-900 mt-0.5">
                  Perbandingan Nilai Lama vs Baru (Before / After)
                </h3>
                <p className="text-xs text-espresso-600 mt-0.5">
                  {selectedLog.summary}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="p-1.5 rounded-lg hover:bg-espresso-100"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 text-xs bg-cream-50 p-3 rounded-xl border border-espresso-200">
              <div>
                <span className="text-espresso-500 block">Waktu Kejadian:</span>
                <span className="font-bold text-espresso-900">
                  {formatDateTimeID(selectedLog.created_at)}
                </span>
              </div>
              <div>
                <span className="text-espresso-500 block">Akun Pemilik:</span>
                <span className="font-bold text-espresso-900">
                  {selectedLog.actor_email}
                </span>
              </div>
              <div>
                <span className="text-espresso-500 block">ID Entitas:</span>
                <span className="font-mono font-bold text-espresso-900">
                  {selectedLog.entity_id}
                </span>
              </div>
            </div>

            {/* Field-by-field comparison table */}
            {diffKeys.length > 0 && (
              <div className="border border-espresso-200 rounded-xl overflow-hidden">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-cream-100 border-b border-espresso-200 text-[11px] font-bold text-espresso-700 uppercase">
                      <th className="py-2.5 px-3">Field / Atribut</th>
                      <th className="py-2.5 px-3 bg-rose-50/60 text-rose-900">
                        Nilai Lama (Before)
                      </th>
                      <th className="py-2.5 px-3 bg-emerald-50/60 text-emerald-900">
                        Nilai Baru (After)
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-espresso-100">
                    {diffKeys.map((key) => {
                      const beforeVal = selectedLog.before_data
                        ? selectedLog.before_data[key]
                        : undefined;
                      const afterVal = selectedLog.after_data
                        ? selectedLog.after_data[key]
                        : undefined;

                      const beforeStr =
                        beforeVal === undefined
                          ? "—"
                          : typeof beforeVal === "object"
                          ? JSON.stringify(beforeVal)
                          : String(beforeVal);

                      const afterStr =
                        afterVal === undefined
                          ? "—"
                          : typeof afterVal === "object"
                          ? JSON.stringify(afterVal)
                          : String(afterVal);

                      const isChanged = beforeStr !== afterStr;

                      return (
                        <tr
                          key={key}
                          className={
                            isChanged ? "bg-amber-50/50 font-semibold" : ""
                          }
                        >
                          <td className="py-2 px-3 font-mono text-[11px] text-espresso-800">
                            {key}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-rose-800 break-all max-w-xs">
                            {beforeStr}
                          </td>
                          <td className="py-2 px-3 font-mono text-[11px] text-emerald-800 break-all max-w-xs">
                            {afterStr}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}

            {/* Raw JSON Side-by-Side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              <div>
                <p className="font-bold text-rose-800 mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Snapshot JSON Sebelum (before_data)
                </p>
                <pre className="p-3 rounded-xl bg-espresso-950 text-cream-100 overflow-x-auto text-[11px] max-h-56">
                  {selectedLog.before_data
                    ? JSON.stringify(selectedLog.before_data, null, 2)
                    : "null (Data baru dibuat / CREATE)"}
                </pre>
              </div>
              <div>
                <p className="font-bold text-emerald-800 mb-1.5 flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5" />
                  Snapshot JSON Sesudah (after_data)
                </p>
                <pre className="p-3 rounded-xl bg-espresso-950 text-cream-100 overflow-x-auto text-[11px] max-h-56">
                  {selectedLog.after_data
                    ? JSON.stringify(selectedLog.after_data, null, 2)
                    : "null (Data telah dihapus / DELETE)"}
                </pre>
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="px-4 py-2 rounded-xl bg-espresso-900 text-cream-50 text-xs font-bold"
              >
                Tutup
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
