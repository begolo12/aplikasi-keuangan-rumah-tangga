# Plan: Mobile UX Overhaul — Tampilan HP Simple & Premium

- Tanggal: 2026-08-25
- Status: running

## Tujuan
Mengoptimalkan pengalaman pengguna di perangkat mobile (HP) agar tampil simple, cepat, dan premium. Desktop tetap memiliki detail lengkap. HP difokuskan ke: saldo, aksi cepat, dan ringkasan — tidak lebih.

## Temuan & Perbaikan

### 1. BottomNav — Tab yang lebih relevan
- *Masalah*: Tab "Anggaran" dan "Laporan" kurang prioritas di HP. Lebih penting akses ke transaksi & dompet.
- *Solusi*: Ganti tab menjadi: Beranda | Transaksi | [FAB Catat] | Dompet | Lainnya (sheet)

### 2. Mobile Dashboard — Terlalu banyak konten
- *Masalah*: Semua komponen (balance, quick actions, wallets, summary, transactions) tumpuk panjang.
- *Solusi*:
  - BalanceHeader mobile: lebih compact, saldo besar di tengah, safe-to-spend mini di bawah
  - QuickActions mobile: hanya 3 tombol utama (Keluar, Masuk, Transfer) — no module shortcuts
  - WalletScroller mobile: scroll horizontal, tidak full grid
  - MonthlySummary mobile: 1 baris 3 angka compact, bukan 3 kartu terpisah
  - Transactions: langsung list tanpa header panjang

### 3. TopHeader mobile — Terlalu padat
- *Masalah*: Period selector + profile button berhimpit di layar kecil
- *Solusi*: Period selector tetap, profile button hanya ikon avatar tanpa teks nama

### 4. "Lainnya" Menu Sheet untuk HP
- *Masalah*: Menu Anggaran, Tagihan, Hutang, Aset, dll tidak accessible di HP
- *Solusi*: Tab ke-5 "Lainnya" membuka bottom sheet grid menu semua modul

## Ruang Lingkup
- [ ] Update `BottomNav.tsx` — 5 tab: Beranda, Transaksi, FAB, Dompet, Lainnya
- [ ] Buat `MobileMoreSheet.tsx` — bottom sheet grid semua modul
- [ ] Update `MonthlySummary.tsx` — mobile compact single-row strip
- [ ] Update `QuickActions.tsx` — hide module shortcuts on mobile
- [ ] Update `BalanceHeader.tsx` — mobile-optimized compact layout
- [ ] Update `TopHeader.tsx` — cleaner mobile header
- [ ] Update `page.tsx` — wire MobileMoreSheet + dompet tab
- [ ] Verifikasi: `npm test`, `npm run lint`, `npm run build`

## File yang Disentuh
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/MobileMoreSheet.tsx` [NEW]
- `src/components/layout/TopHeader.tsx`
- `src/components/dashboard/MonthlySummary.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai
1. Di HP: saldo terlihat jelas, 3 aksi cepat mudah dijangkau, navigasi via bottom nav 5 tab + sheet
2. Di PC: tidak ada perubahan visual
3. Test & build lulus 100%
