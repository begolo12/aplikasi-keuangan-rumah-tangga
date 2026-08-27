# Plan: Optimalisasi Inputan, Flow & Sinkronisasi Data

- Tanggal: 2026-08-27
- Status: done
- Catatan eksekusi: semua bagian A & B tuntas; C juga tuntas (range date sargable, visibilitychange refresh, mapping constraint mati dihapus). Item DELETE offline dieksekusi sebagai guard di handler dengan pesan jelas (setara nonaktif), bukan menyantroning antrean.
- Basis: audit sync/read-only (offlineQueue, apiFetch, bootstrap, SW, form inti)

## Tujuan
Menutup celah integritas uang: bootstrap yang memasker kegagalan DB, deadlock antrean offline
lintas-tab, data loss saat crash IndexedDB, race edit online/offline, serta memperkuat form
(double-submit, timeout) dan aksesibilitas kontrol (Escape, ukuran sentuh).

## Ruang Lingkup

### A. Integritas Sync (prioritas tertinggi, jalur uang)
- [x] Bootstrap gagal keras: hapus `.catch(() => [])`; tambahkan indikator error state di dashboard bila sub-query gagal. Jika butuh graceful, set field `degraded: true` dan tampilkan banner peringatan, BUKAN angka Rp0 diam-diam.
- [x] Fix bug agregasi `safe_to_spend`: kewajiban hutang difilter jatuh tempo bulan berjalan (komentar baris kode menyebut "due this month" tapi implement menjumlah SEMUA unpaid).
- [x] `persistAttempt` atomik: PUT attempts dulu (upsert langsung), baru delete saat kirim sukses. Eliminasi jendela data loss crash.
- [x] Drain lintas-tab: pakai `navigator.locks.request('kaskeluarga-drain')` (fallback best-effort tanpa lock utk browser lama) sehingga satu tab pengirim saja.
- [x] Edit (PUT) offline diberi `Idempotency-Key` juga + server PUT validasi `updated_at` sederhana (menolak replay basi) agar versi lama tidak menimpa edit terbaru.
- [x] Keputusan DELETE offline: antrekan endpoint `[id]` verboten secara aman; alternatif paling murah, NONAKTIFKAN tombol hapus saat offline dengan tooltip alasan (mencegah deletions hilang senyap).

### B. Form & Kontrol Input
- [x] Double-submit guard sinkron: `useRef(true)` cek di awal `handleSubmit`, bukan cuma state `isLoading`.
- [x] `apiFetch` mendapat timeout default (mis. 15s AbortController) + drain offline queue ikut memakainya.
- [x] TransactionModal submit pindah ke `apiFetch` (paritas error handling dgn form lain).
- [x] BottomNav more-sheet ditutup dengan Escape (+ fokus kembali ke trigger).
- [x] Chip preset AmountInput & segmented control area sentuh >= 44px (mobile).

### C. Kualitas Query (opsional, kerjakan jika A-B tuntas)
- [x] Ganti `EXTRACT(MONTH/YEAR ...)` di WHERE bootstrap/reports jadi range `date >= AND <` (index-aware).
- [x] Refresh otomatis saat tab kembali fokus (`visibilitychange`, debounce 5s) untuk multi-device freshness.
- [x] Bersihkan mapping PG error `wallets_balance_nonnegative` yang sudah mati (constraint dilepas).

## File yang Disentuh
- `src/lib/offlineQueue.ts`, `src/lib/apiFetch.ts`, `src/lib/apiHelpers.ts`
- `src/app/api/dashboard/bootstrap/route.ts`
- `src/app/page.tsx`
- `src/components/layout/AppShell.tsx`, `OfflineBanner.tsx`, `BottomNav.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `src/components/ui/AmountInput.tsx`
- `scripts/audit-self-test.ts`, `scripts/e2e-full-suite.ts` (tambah skenario: degraded bootstrap, idempotent PUT replay)

## Kriteria Selesai (Definition of Done)
1. Simulasi gagal-query bootstrap TIDAK menampilkan angka fiktif Rp0 (error state/degraded jelas).
2. Alokasi offline: POST dobel lintas-tab TIDAK mencatat dua kali; crash saat retry tidak menghilangkan item antrean.
3. Edit replay (PUT basi) tidak menimpa revisi terbaru.
4. Semua form tak bisa double-submit meski diklik 2x frame sama; request manggung berhenti di 15s.
5. Escape menutup all dialog/sheet; kontrol sentuh >= 44px.
6. `npm run build` + `npm test` (audit + E2E) lulus 100%.
