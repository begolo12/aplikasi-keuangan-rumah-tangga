# Plan: Remediasi Audit Lanjutan (Init Guard, Sinkronisasi Hutang-Tagihan & Hardening)

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Menutup temuan audit keamanan lanjutan: 2 P1 (bypass X-Init-Secret pada endpoint init, relasi hutang-tagihan yang belum tersinkron dua arah) dan 6 P2 (atomicity insert hutang, proteksi kategori terpakai, CSV formula injection, batas body chunked, pencabutan sesi JWT via token_version, rate limiting best effort) plus hardening kecil (health check, catatan privasi struk, dokumentasi test audit).

## Ruang Lingkup
- [x] FIX 1 (P1): satu pintu otorisasi `authorizeInit(req)` di `src/app/api/init/route.ts`; header wajib persis saat INIT_SECRET diset, jalur fallback hanya saat env kosong dan DB masih kosong.
- [x] FIX 2a (P1): migrasi kolom `recurring_bills.debt_id` + index di init/route.ts dan scripts/run-db-migrations.ts (setelah langkah 3).
- [x] FIX 2b (P1): POST /api/debts mengisi `debt_id` saat auto_schedule_bill membuat tagihan cicilan.
- [x] FIX 2c (P1): rapikan query parameter tak terpakai di /api/debts/[id]/pay.
- [x] FIX 2d (P1): sinkronisasi dua arah di /api/bills/[id]/pay (kunci debts FOR UPDATE, insert debt_payments, update paid_amount/status, dalam transaksi sama).
- [x] FIX 3 (P2): bungkus INSERT debts + INSERT recurring_bills dalam withTransaction.
- [x] FIX 4 (P2): proteksi hapus kategori yang dipakai recurring_bills.
- [x] FIX 5 (P2): mitigasi CSV formula injection di export-csv.
- [x] FIX 6 (P2): readJsonBody mendukung body chunked dengan batas keras 2.500.000 byte.
- [x] FIX 7 (P2): pencabutan sesi JWT: kolom users.token_version, claim tv, cek di getAuthSession, login/register/logout.
- [x] FIX 8 (P2): src/lib/rateLimit.ts + terapkan di login, households/join, settings/reset-data.
- [x] FIX 9 (P2): health route hanya menyertakan latencyMs/uptimeSeconds untuk sesi valid.
- [x] FIX 10: catatan privasi di ReceiptParserModal.
- [x] FIX 11: koreksi baris "Test audit" di AGENTS.md.
- [x] Verifikasi: test:audit 136 passed, lint 0 error (maks 7 warning lama), build sukses, cek kolom DB sebelum/sesudah migrasi live.

## File yang Disentuh
- src/app/api/init/route.ts
- src/app/api/debts/route.ts
- src/app/api/debts/[id]/pay/route.ts
- src/app/api/bills/[id]/pay/route.ts
- src/app/api/categories/[id]/route.ts
- src/app/api/reports/export-csv/route.ts
- src/app/api/auth/login/route.ts
- src/app/api/auth/register/route.ts
- src/app/api/auth/logout/route.ts
- src/app/api/health/route.ts
- src/app/api/households/join/route.ts
- src/app/api/settings/reset-data/route.ts
- src/lib/apiHelpers.ts
- src/lib/auth.ts
- src/lib/rateLimit.ts (baru)
- scripts/run-db-migrations.ts
- src/components/transactions/ReceiptParserModal.tsx
- AGENTS.md
- changelog.md

## Kriteria Selesai (Definition of Done)
- `npm run test:audit` (JWT_SECRET dummy) lulus 136 passed 0 failed.
- `npm run lint` 0 error, warning tidak bertambah dari 7 yang sudah ada.
- `npm run build` sukses.
- Migrasi `npx tsx scripts/run-db-migrations.ts` dijalankan idempoten; kolom `recurring_bills.debt_id` dan `users.token_version` terverifikasi ada di DB live (cek READ-ONLY sebelum & sesudah).
- Status plan diubah menjadi done dan entri changelog baru dibuat di paling atas.
