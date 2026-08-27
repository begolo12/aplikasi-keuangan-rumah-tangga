# Plan: Rombak Identitas Visual "Klasik Rumah"

- Tanggal: 2026-08-27
- Status: done
- Direction: `DESIGN.md` (baru, persona pilihan pemilik: klasik edisi rumah)
- Dial: ENERGY 1 / RHYTHM 2 / MOTION 1

## Tujuan
Mengganti identitas visual dari system warm-neutral generik menjadi edisi "Klasik Rumah":
ivory/porselen + emerald tua + terracotta/lumut sebagai semantik, dengan SERIF DISPLAY untuk
angka besar sebagai motif identitas. Menyamakan semua hard-coded color dengan token system.

## Ruang Lingkup
- [x] Token warna baru di `globals.css` (`:root` light + `.dark`): ivory/porselen bg-surface ramp, emerald tua primary, terracotta expense, hijau lumut income, biru-abu transfer, kuning hangat warning.
- [x] Font serif display (self-host `next/font/local` atau Google via `next/font/google`) hanya untuk angka besar; utility class `.font-display-num` + tabular-nums.
- [x] Terapkan serif display: `BalanceHeader`, angka safe-to-spend, TotalPeriode di laporan (P&L/Neraca/Cashflow).
- [x] Hapus warna modul berlebih di `BottomNav.tsx` & `SidebarNav.tsx`: ikon modul jadi netral + state aktif primary; badge tetap warning. Palet kembali <= 3 core + aksen.
- [x] Ganti hard-coded `bg-amber-500/*` (TransactionModal notice) & `bg-purple-600`, `bg-blue-600`, dsb dengan token semantik (`warning`, dsb).
- [x] Naikkan tap target segmented control tipe transaksi & chip suggestion ke >= 44px tinggi area sentuh.
- [x] Verifikasi kontras WCAG AA semua kombinasi text/bg di KEDUA tema (termasuk text-muted di atas surface baru).
- [x] Verifikasi mobile 360px-430px: tanpa overflow horizontal, kartu tidak saling tabrak.
- [x] `npm run build` + `npm test` lulus.

## File yang Disentuh
- `src/app/globals.css`
- `tailwind.config.ts`
- `src/app/layout.tsx`
- `src/components/layout/BottomNav.tsx`, `SidebarNav.tsx`, `TopHeader.tsx`
- `src/components/dashboard/BalanceHeader.tsx`, `MonthlySummary.tsx`
- `src/components/transactions/TransactionModal.tsx`
- `src/components/reports/*` (angka display saja, tanpa ubah logika)
- `DESIGN.md` (referensi, tidak berubah)

## Kriteria Selesai (Definition of Done)
1. Swap logo/nama pun app masih terasa spesifik "dompet keluarga", bukan generik.
2. Semua warna melewati token system; scan hard-coded hex/tailwind arbitrary color hasil grep bersih (toleransi: overlay black/white translucen).
3. Kontras AA lulus di light & dark; toggle tema aman dua arah.
4. Build + test 100% lulus.
