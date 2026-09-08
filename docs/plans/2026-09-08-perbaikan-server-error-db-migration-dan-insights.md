# Plan: Perbaikan Server Error 500 (DB Migration, Insights Query, & Safe Event Loading)

- Tanggal: 2026-09-08
- Status: done

## Tujuan
Memperbaiki error "Terjadi kesalahan pada server." di dashboard aplikasi dengan:
1. Menerapkan migrasi tabel baru (financial_events, subscriptions, budgets_templates) langsung ke database produksi Neon Postgres.
2. Memperbaiki query SQL di src/app/api/insights/route.ts yang mengalami error column b.category_id does not exist akibat kolom category_id tidak disertakan dalam klausa SELECT CTE latest_budgets.
3. Membungkus pemanggilan getFinancialEvents di src/app/page.tsx dengan try-catch agar kegagalan parsial pada modul event tidak menggagalkan seluruh bootstrap dashboard utama.
4. Memperbarui src/app/api/init/route.ts agar migrasi skema tabel idempoten dapat dijalankan tanpa blokir 403 saat database telah memiliki data users.
5. Deploy ulang ke Vercel dan verifikasi log produksi bebas error 500.

## Ruang Lingkup
- [x] Jalankan migrasi DDL pada Neon Postgres (subscriptions, budgets_templates, financial_events, triggers, dan indexes).
- [x] Perbaiki query CTE latest_budgets di src/app/api/insights/route.ts untuk menyertakan category_id.
- [x] Tambahkan try-catch safe wrapper pada getFinancialEvents(user.id) di src/app/page.tsx.
- [x] Perbaiki index expression syntax di src/app/api/init/route.ts.
- [x] Verifikasi npm run test:audit & npm run build (151/151 passed, build 0 error).
- [x] Commit & push ke GitHub main dan deploy ke Vercel production.
- [x] Catat hasil ke changelog.md.

## File yang Disentuh
- src/app/api/insights/route.ts
- src/app/page.tsx
- src/app/api/init/route.ts
- docs/plans/2026-09-08-perbaikan-server-error-db-migration-dan-insights.md
- changelog.md

## Kriteria Selesai (Definition of Done)
1. Tabel financial_events, subscriptions, budgets_templates terkonfirmasi ada di database Neon.
2. Endpoint /api/insights mengembalikan status 200 tanpa error PostgreSQL.
3. Dashboard pengguna memuat seluruh widget tanpa banner merah "Terjadi kesalahan pada server.".
4. npm run test:audit lulus 151/151 dan npm run build berhasil.
5. Vercel production deploy berhasil dan runtime logs bersih dari 500 error.
