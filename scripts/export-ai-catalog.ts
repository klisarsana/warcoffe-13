// ============================================================================
// WARCOFFE 13 — EXPORT KATALOG MENU UNTUK AI SERVICE
// ============================================================================
// Script ini mengekspor 57 item menu dari seed TypeScript ke JSON yang dipakai
// oleh service Python untuk:
// - mencocokkan nama item hasil ekstraksi teks
// - mengambil id, kategori, dan harga varian
//
// Jalankan dengan: npm run ai:export-catalog
// ============================================================================

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import {
  INITIAL_MENU_CATEGORIES,
  INITIAL_MENU_ITEMS,
} from "../src/lib/menu-seed-data";

const categoryNameById = new Map(
  INITIAL_MENU_CATEGORIES.map((category) => [category.id, category.name])
);

const catalog = INITIAL_MENU_ITEMS.map((item) => ({
  id: item.id,
  name: item.name,
  category_id: item.category_id,
  category_name: categoryNameById.get(item.category_id) ?? "Lainnya",
  description: item.description,
  temperature_mode: item.temperature_mode,
  default_price: item.default_price,
  hot_price: item.hot_price,
  cold_price: item.cold_price,
  stock_unit: item.stock_unit,
}));

const outputPath = resolve("ai-service/data/menu_catalog.json");
mkdirSync(dirname(outputPath), { recursive: true });
writeFileSync(outputPath, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");

console.log(
  `[OK] ${catalog.length} item menu diekspor ke ${outputPath}`
);
