// ============================================================================
// WARCOFFE 13 — INDONESIAN LOCALE (id-ID), RUPIAH (IDR), & CSV UTILITIES
// ============================================================================

import { MenuItem, MenuVariantOption } from "@/types/warcoffe";

/**
 * Format integer Rupiah ke string mata uang Indonesia (contoh: Rp11.000)
 */
export function formatIDR(amount: number | null | undefined): string {
  if (amount === null || amount === undefined || Number.isNaN(amount)) {
    return "Rp0";
  }
  const rounded = Math.round(amount);
  const isNegative = rounded < 0;
  const formattedNumber = new Intl.NumberFormat("id-ID", {
    maximumFractionDigits: 0,
  }).format(Math.abs(rounded));
  return isNegative ? `-Rp${formattedNumber}` : `Rp${formattedNumber}`;
}

/**
 * Format tanggal ISO ke format tanggal Indonesia lengkap (contoh: 20 Nov 2026)
 */
export function formatDateID(isoOrDate: string): string {
  if (!isoOrDate) return "-";
  const d = new Date(isoOrDate);
  if (Number.isNaN(d.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(d);
}

/**
 * Format tanggal dan waktu ISO ke format Indonesia (contoh: 20 Nov 2026, 14.30)
 */
export function formatDateTimeID(isoString: string): string {
  if (!isoString) return "-";
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) return isoString;
  return new Intl.DateTimeFormat("id-ID", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

/**
 * Format YYYY-MM menjadi nama bulan Bahasa Indonesia (contoh: "November 2026")
 */
export function formatMonthKeyID(monthKey: string): string {
  const parts = monthKey.split("-");
  if (parts.length !== 2) return monthKey;
  const year = Number(parts[0]);
  const month = Number(parts[1]);
  if (!year || !month) return monthKey;
  const date = new Date(year, month - 1, 1);
  return new Intl.DateTimeFormat("id-ID", {
    month: "long",
    year: "numeric",
  }).format(date);
}

/**
 * Mendapatkan YYYY-MM saat ini berdasarkan waktu lokal
 */
export function getCurrentMonthKey(refDate: Date = new Date()): string {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, "0");
  return `${year}-${month}`;
}

/**
 * Mendapatkan YYYY-MM-DD berdasarkan waktu lokal
 */
export function getLocalDateKey(refDate: Date = new Date()): string {
  const year = refDate.getFullYear();
  const month = String(refDate.getMonth() + 1).padStart(2, "0");
  const day = String(refDate.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/**
 * Menghasilkan daftar opsi varian yang sah untuk sebuah item menu.
 * Mematuhi aturan: jangan menebak varian panas/dingin bila temperature_mode === "UNSPECIFIED".
 */
export function getMenuVariantOptions(item: MenuItem): MenuVariantOption[] {
  switch (item.temperature_mode) {
    case "HOT_ONLY":
      return [
        {
          variant_key: "PANAS",
          label: "Panas",
          price: item.hot_price ?? item.default_price ?? 0,
        },
      ];
    case "HOT_COLD": {
      const options: MenuVariantOption[] = [];
      if (item.hot_price !== null && item.hot_price >= 0) {
        options.push({
          variant_key: "PANAS",
          label: "Panas",
          price: item.hot_price,
        });
      }
      if (item.cold_price !== null && item.cold_price >= 0) {
        options.push({
          variant_key: "DINGIN",
          label: "Dingin",
          price: item.cold_price,
        });
      }
      return options;
    }
    case "UNSPECIFIED":
      return [
        {
          variant_key: "UNSPECIFIED",
          label: "Suhu Tidak Disebutkan",
          price: item.default_price ?? 0,
        },
      ];
    case "NONE":
    default:
      return [
        {
          variant_key: "DEFAULT",
          label: "Standar",
          price: item.default_price ?? 0,
        },
      ];
  }
}

/**
 * Ringkasan teks harga sebuah item menu untuk ditampilkan pada katalog & POS
 */
export function formatMenuPriceLabel(item: MenuItem): string {
  if (item.temperature_mode === "HOT_ONLY") {
    return `Panas ${formatIDR(item.hot_price)}`;
  }
  if (item.temperature_mode === "HOT_COLD") {
    return `Panas ${formatIDR(item.hot_price)} • Dingin ${formatIDR(item.cold_price)}`;
  }
  if (item.temperature_mode === "UNSPECIFIED") {
    return `${formatIDR(item.default_price)} (suhu tidak disebutkan)`;
  }
  return formatIDR(item.default_price);
}

/**
 * Konversi array objek menjadi string CSV yang valid (dengan escaping tanda kutip)
 */
export function objectsToCSV(
  headers: Array<{ key: string; label: string }>,
  rows: Array<Record<string, string | number | boolean | null | undefined>>
): string {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return "";
    const str = String(val);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerLine = headers.map((h) => escapeCell(h.label)).join(",");
  const dataLines = rows.map((row) =>
    headers.map((h) => escapeCell(row[h.key])).join(",")
  );
  return [headerLine, ...dataLines].join("\n");
}
