# Plan: Fase 1 — Kas Rumah Tangga Bersama (Shared Household)

- Tanggal: 2026-09-01
- Status: done
- Induk: `docs/plans/2026-09-01-roadmap-improvement-aplikasi.md`

## Tujuan
Menjadikan KasKeluarga benar-benar "Kas Keluarga": beberapa anggota keluarga dapat bergabung ke satu household, berbagi dompet bersama, mencatat transaksi dengan atribusi pencatat, dan melihat laporan per-anggota.

## Keputusan Desain
- Model data minimal: `households` (satu owner) + `household_members` (owner/member). User hanya boleh tergabung di satu household.
- Dompet bersama = wallet milik pembuatnya dengan `household_id` terisi. Semua anggota household dapat melihat dan mencatat transaksi ke dompet tersebut; dompet tanpa `household_id` tetap pribadi.
- Atribusi pencatat = `transactions.user_id` (pencatat), ditampilkan nama via join `users` pada transaksi dompet bersama.
- Undangan via kode undangan 8 karakter (owner menampilkan kode, calon member join dengan kode). Tidak ada email/OTP pada fase ini.
- Badge aktivitas: hitungan transaksi 7 hari terakhir oleh anggota lain pada dompet bersama.

## Ruang Lingkup
- [ ] Migrasi DB: tabel `households`, `household_members`, kolom `wallets.household_id`.
- [ ] API `/api/households` (GET status+member+badge, POST buat household, DELETE keluar/bubar).
- [ ] API `/api/households/join` (POST kode undangan).
- [ ] API `/api/households/members/[id]` (DELETE anggota oleh owner).
- [ ] API `/api/households/report` (laporan per-anggota per bulan pada dompet bersama).
- [ ] `wallets` route: list menyertakan dompet bersama household; create mendukung `is_shared`.
- [ ] `transactions` route: create diizinkan pada dompet bersama (update saldo by id, tanpa filter user_id); list menyertakan transaksi dompet bersama + nama pencatat.
- [ ] Bootstrap: transaksi dompet bersama ikut termuat + info household ringkas.
- [ ] UI: `HouseholdView` (buat/gabung/kelola anggota, kode undangan, laporan per-anggota, badge aktivitas).
- [ ] Navigasi: tab `household` di BottomNav & SidebarNav; wiring di `page.tsx`.
- [ ] `TransactionItem` menampilkan nama pencatat pada transaksi dompet bersama.

## File yang Disentuh
- `src/app/api/init/route.ts` (migrasi)
- `src/app/api/households/route.ts` (baru)
- `src/app/api/households/join/route.ts` (baru)
- `src/app/api/households/members/[id]/route.ts` (baru)
- `src/app/api/households/report/route.ts` (baru)
- `src/app/api/wallets/route.ts`
- `src/app/api/transactions/route.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/lib/household.ts` (baru: helper membership)
- `src/lib/validations.ts`, `src/lib/types.ts`
- `src/components/household/HouseholdView.tsx` (baru)
- `src/components/layout/BottomNav.tsx`, `SidebarNav.tsx`
- `src/components/transactions/TransactionItem.tsx`
- `src/app/page.tsx`

## Kriteria Selesai (Definition of Done)
1. Fitur jalan end-to-end: buat household → share kode → anggota join → dompet bersama → transaksi tercatat dengan atribusi → laporan per-anggota muncul.
2. `npm run lint` dan `npm run build` lulus 0 error.
3. `npm test` lulus tanpa regresi.
4. Isolasi data tetap terjaga: dompet pribadi tidak pernah bocor ke anggota lain; transaksi lintas user hanya pada dompet bersama.
5. Input divalidasi dengan Zod.
