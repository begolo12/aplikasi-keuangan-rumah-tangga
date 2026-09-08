# Plan: Peningkatan Aplikasi — Privacy Mode, Daily Safe-to-Spend, PWA Shortcuts & Print Laporan

- Tanggal: 2026-08-30
- Status: done

## Tujuan
Meningkatkan kenyamanan, keamanan privasi harian, dan kecepatan pencatatan pengguna KasKeluarga melalui 4 fitur bernilai tinggi:
1. **Mode Sensor Saldo (Global Privacy Blur)**: Tombol toggle sensor nominal di header dengan persistensi localStorage agar aman saat membuka aplikasi di ruang publik.
2. **Indikator Kuota Belanja Harian (Daily Safe-to-Spend)**: Rekomendasi nominal maksimal belanja per hari berdasarkan sisa dana aman dibagi sisa hari kalender bulan berjalan.
3. **PWA App Shortcuts**: Pintasan cepat pada launcher Android/iOS (Catat Pengeluaran, Catat Pemasukan, Scan Struk AI) melalui `manifest.json` dan penangan URL di `page.tsx`.
4. **Cetak & Ekspor Laporan PDF Siap Cetak**: Tombol cetak langsung `window.print()` dengan optimasi CSS `@media print` untuk rekap laporan bulanan A4 bersih.

## Ruang Lingkup
- [x] Konfigurasi shortcuts di `public/manifest.json`.
- [x] Penanganan query string `?action=new-expense`, `?action=new-income`, `?action=scan-receipt` pada `src/app/page.tsx`.
- [x] State dan tombol Global Privacy Blur di `src/components/layout/TopHeader.tsx` dan CSS `privacy-blur` di `src/app/globals.css`.
- [x] Perhitungan dan widget Daily Safe-to-Spend di `src/components/dashboard/BalanceHeader.tsx`.
- [x] Tombol cetak laporan dan styling `@media print` di `src/components/reports/ReportsView.tsx` dan `src/app/globals.css`.
- [x] Penambahan unit test kalkulasi kuota harian di `scripts/audit-self-test.ts`.
- [x] Verifikasi build Next.js dan suite pengujian.

## File yang Disentuh
- `public/manifest.json`
- `src/app/globals.css`
- `src/app/page.tsx`
- `src/components/layout/TopHeader.tsx`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/reports/ReportsView.tsx`
- `scripts/audit-self-test.ts`
- `changelog.md`
- `docs/plans/2026-08-30-upgrade-privacy-dailyquota-pwa-shortcuts.md`

## Kriteria Selesai (Definition of Done)
1. PWA Shortcuts terdaftar di manifest dan membuka modal terkait saat parameter URL terbaca.
2. Global privacy blur aktif saat tombol mata di header ditekan dan tersimpan di localStorage.
3. Kuota harian terhitung akurat sesuai sisa hari bulan berjalan.
4. Laporan keuangan dapat dicetak secara bersih tanpa elemen navigasi via print preview browser.
5. Seluruh test audit dan E2E lulus 100%.
6. `npm run build` sukses tanpa error.
