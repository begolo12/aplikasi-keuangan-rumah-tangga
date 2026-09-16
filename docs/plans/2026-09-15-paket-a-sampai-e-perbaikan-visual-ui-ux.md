# Plan: Perbaikan Visual, UI & UX Paket A–E

- Tanggal: 2026-09-15
- Status: done
- Sumber: `rekomendasi-ui-ux.md` (disetujui pemilik produk 2026-09-15)

## Tujuan

Mengeksekusi seluruh rekomendasi perbaikan visual/UI/UX hasil audit 2026-09-15, dikelompokkan
menjadi lima paket. Fokus: menghilangkan bug yang terlihat pengguna, menaikkan keterbacaan untuk
pengguna usia lanjut, memangkas friksi alur mencatat transaksi, dan menyembuhkan akar inkonsistensi
komponen. Semua tetap dalam batas `DESIGN.md` (persona "Klasik Rumah").

## Ruang Lingkup

### Paket A — Bug nyata & quick win
- [x] A1 Hapus tombol "Simpan Perubahan" ganda di `SettingsView.tsx:358-377`
- [x] A2 Ganti `text-warning-fg` menjadi `text-warning` di 3 tempat (latar terang)
- [x] A3 Render error hapus transaksi yang selama ini tidak pernah tampil
- [x] A4 Perbaiki kelas Tailwind mati `py-0.2` dan badge SidebarNav (warna + radius + ukuran)
- [x] A5 Auto-focus modal ke kolom nominal + urut ulang field kategori/dompet
- [x] A6 Tambahkan `xl` dan `2xl` ke `boxShadow` di `tailwind.config.ts`

### Paket B — Tipografi, kontras, tap target
- [x] B1 Naikkan semua `text-[8.5px]`/`text-[9px]`/`text-[10px]` ke minimal `text-[11px]`
- [x] B2 Perbaiki kontras: `text-text-muted` di atas `bg-surface-3`, `text-white/75` di hero, `text-text-muted/50`
- [x] B3 Naikkan tap target < 44px pada kontrol mobile

### Paket C — Hierarki dashboard & umpan balik
- [x] C1 Urut ulang dashboard: daftar transaksi naik, kartu referensi turun
- [x] C2 Batasi daftar transaksi dashboard + tombol "Lihat semua"
- [x] C3 Munculkan "Scan Struk" di HP (QuickActions, TransactionModal, BottomNav)
- [x] C4 Banner backup dipindah dari posisi teratas
- [x] C5 Toast global + pasang pada aksi utama

### Paket D — Ekstraksi komponen bersama
- [x] D1 `ui/StatCard.tsx` + `ui/StatGrid.tsx`, ganti 11 implementasi
- [x] D2 `ui/ProgressBar.tsx`, ganti 7 varian
- [x] D3 `ui/Alert.tsx`, ganti 5 variasi
- [x] D4 `ui/FormLabel.tsx`, tanda field wajib konsisten

### Paket E — Bahasa, palet, aksesibilitas, performa scroll
- [x] E1 `src/lib/nav.ts`: satu label per modul, dipakai SidebarNav/BottomNav/TopHeader
- [x] E2 `src/lib/chartPalette.ts` + ganti hex literal di 3 file chart/wallet
- [x] E3 `aria-current` di SidebarNav, `focus-visible` pada kelas dasar Button
- [x] E4 Hapus `backdrop-blur` pada elemen sticky/fixed (TopHeader, sub-kartu BalanceHeader)
- [x] E5 Ganti istilah akuntansi (Neraca, DER, Run-rate, Net Worth, DTI) dengan bahasa keluarga
- [x] E6 Ganti `confirm()` bawaan browser dengan `ConfirmModal`
- [x] E7 Seragamkan label pintasan keyboard dengan handler sebenarnya
- [x] E8 Hapus `animate-pulse` pada badge status
- [x] E9 Samakan `DashboardSkeleton` dengan layout dashboard nyata
- [x] E10 Seragamkan judul halaman, radius kartu/badge/kotak ikon, dan padding kartu ringkasan

## File yang Disentuh

- Konfigurasi: `tailwind.config.ts`
- Lib baru: `src/lib/nav.ts`, `src/lib/chartPalette.ts`
- UI baru: `src/components/ui/StatCard.tsx`, `src/components/ui/Toast.tsx`, `src/components/ui/ProgressBar.tsx`, `src/components/ui/Alert.tsx`, `src/components/ui/FormLabel.tsx`
- Layout: `AppShell.tsx`, `BottomNav.tsx`, `SidebarNav.tsx`, `TopHeader.tsx`
- Dashboard: `page.tsx`, `BalanceHeader.tsx`, `QuickActions.tsx`, `MonthlySummary.tsx`, `WalletScroller.tsx`, `InsightWidget.tsx`
- Modul: `SettingsView.tsx`, `WalletsView.tsx`, `BillsView.tsx`, `BillItem.tsx`, `DebtsView.tsx`, `DebtItem.tsx`, `SubscriptionsView.tsx`, `SubscriptionItem.tsx`, `BudgetView.tsx`, `BudgetProgressBar.tsx`, `CalendarView.tsx`, `AssetsView.tsx`, `GoalsView.tsx`, `HouseholdView.tsx`, `EvaluationView.tsx`, `ScenarioSimulator.tsx`, `TransactionModal.tsx`, `TransactionItem.tsx`, `ReceiptParserModal.tsx`, `BudgetTemplateSelectorModal.tsx`
- Laporan: `ReportsView.tsx`, `CategoryChart.tsx`, `CashflowChart.tsx`, `BalanceSheetReport.tsx`, `CashflowStatement.tsx`, `IncomeStatementReport.tsx`, `YearlyReport.tsx`, `FinancialRatiosReport.tsx`
- Budget cards: `ColdMoneyCard.tsx`, `FinancialSafetyPlanCard.tsx`, `ExpenseProjectionCard.tsx`, `CollapseForecastCard.tsx`
- Skeleton: `src/components/ui/LoadingSkeleton.tsx`, `EmptyState.tsx`

## Batasan (tidak boleh dilanggar)

- JANGAN sentuh `src/app/layout.tsx:57` (`selection:text-white`) dan semua `text-white` di `BalanceHeader.tsx`.
- JANGAN ubah nilai `color` kategori yang tersimpan di database. Palet chart hanya untuk tampilan.
- JANGAN jalankan migrasi DB atau mengubah/menghapus data DB.
- JANGAN jalankan `npm test` (test:e2e destruktif terhadap DB). Hanya `build`, `lint`, `test:audit`.
- JANGAN commit.
- Preserve komentar/docstring yang tidak terkait perubahan.
- Pertahankan pencapaian Paket 1–5: token `primary-hero`, kontras AA, `shadow-2xs`/`xs`, peniadaan data dummy.

## Kriteria Selesai (Definition of Done)

1. `npm run lint` 0 error (warning lama `tabHistory` di `page.tsx` boleh tetap ada).
2. `npm run build` lulus.
3. `npm run test:audit` tetap 159/159 lulus (tidak ada regresi assertion).
4. Tidak ada lagi `text-[8.5px]`, `text-[9px]`, `text-[10px]` di `src/**/*.tsx`.
5. Tidak ada lagi `py-0.2` (kelas Tailwind mati).
6. Tidak ada lagi `text-warning-fg` di atas latar terang.
7. Tidak ada lagi hex literal warna di `src/components/**` kecuali pemetaan warna kategori DB.
8. Tidak ada `backdrop-blur` pada elemen `sticky`/`fixed`.
9. Satu sumber label modul (`src/lib/nav.ts`) dipakai ketiga navigasi.
10. Tombol "Simpan Perubahan" hanya satu di `SettingsView`.
11. Entri changelog baru ditambahkan di paling atas `changelog.md`.
