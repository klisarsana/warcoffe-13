// ============================================================================
// WARCOFFE 13 — MENU CATALOG SEED SCRIPT (ONLY MENU CATALOG, 0 TRANSACTIONS)
// Capstone Project Asah 2026 | Team ID: A26-CS187
// ============================================================================
// Jalankan dengan: npm run seed
// ============================================================================

import { createClient } from "@supabase/supabase-js";
import {
  INITIAL_MENU_CATEGORIES,
  INITIAL_MENU_ITEMS,
} from "../src/lib/menu-seed-data";

async function runSeed() {
  console.log("============================================================");
  console.log("WARCOFFE 13 — SEED KATALOG MENU AWAL (57 ITEM)");
  console.log("============================================================");
  console.log(`Total Kategori : ${INITIAL_MENU_CATEGORIES.length}`);
  console.log(`Total Menu Seed: ${INITIAL_MENU_ITEMS.length} (Wajib 57 entri)`);

  if (INITIAL_MENU_ITEMS.length !== 57) {
    throw new Error(
      `Jumlah menu seed harus tepat 57, ditemukan ${INITIAL_MENU_ITEMS.length}`
    );
  }

  // Pastikan semua current_stock adalah null
  const nonNullStock = INITIAL_MENU_ITEMS.filter((m) => m.current_stock !== null);
  if (nonNullStock.length > 0) {
    throw new Error(
      "Pelanggaran aturan data: Stok awal pada seed harus bernilai NULL!"
    );
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();

  if (!supabaseUrl || !supabaseKey) {
    console.log(
      "\n[INFO] Kredensial Supabase belum diatur di environment variables."
    );
    console.log(
      "[INFO] Aplikasi secara otomatis memuat 57 item menu Warcoffe 13 ke Local Fallback Store saat dijalankan."
    );
    console.log(
      "[INFO] Jika ingin melakukan seed ke Supabase Cloud, isi NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local atau jalankan file supabase/seed.sql di SQL Editor Supabase."
    );
    return;
  }

  console.log("\nMenghubungkan ke Supabase PostgreSQL...");
  const supabase = createClient(supabaseUrl, supabaseKey);

  const { error: catErr } = await supabase
    .from("menu_categories")
    .upsert(INITIAL_MENU_CATEGORIES, { onConflict: "id" });

  if (catErr) {
    console.error("Gagal melakukan seed kategori:", catErr.message);
    process.exit(1);
  }

  const { error: menuErr } = await supabase
    .from("menu_items")
    .upsert(INITIAL_MENU_ITEMS, { onConflict: "id" });

  if (menuErr) {
    console.error("Gagal melakukan seed katalog menu:", menuErr.message);
    process.exit(1);
  }

  console.log(
    "SUKSES: 3 Kategori dan 57 Item Menu Warcoffe 13 berhasil di-seed ke Supabase!"
  );
}

runSeed().catch((err) => {
  console.error(err);
  process.exit(1);
});
