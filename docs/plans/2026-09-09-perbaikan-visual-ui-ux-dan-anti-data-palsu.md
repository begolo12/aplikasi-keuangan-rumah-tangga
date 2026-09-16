# Plan: Perbaikan Visual, UI/UX, dan Eliminasi Data Palsu

- Tanggal: 2026-09-09
- Status: done

## Tujuan
Memastikan seluruh antarmuka aplikasi KasKeluarga bebas dari metrik/klaim data palsu (R-17, R-18, R-36, R-38), menyelaraskan desain visual dengan sistem "Klasik Rumah" (`DESIGN.md`), serta menyempurnakan navigasi mobile dan desktop agar memudahkan pengguna dalam pencatatan keuangan harian.

## Ruang Lingkup
- [x] `LandingView.tsx`:
  - Hapus bagian metrik palsu (10K+ users, 1M+ transactions, 99.9% uptime, 4.9/5 satisfaction).
  - Ganti klaim fiktif "ribuan keluarga" dan bintang rating dengan proposisi nilai jujur (Privasi data lokal, PWA Offline-ready, Open & Transparan).
  - Hapus skema pricing SaaS fiktif ("Family Pro Rp 29.000/bln"); ganti dengan panduan mode penggunaan nyata (Mode Mandiri vs Mode Keluarga Bersama).
  - Ganti warna hardcoded gradien dengan CSS token tema `DESIGN.md` (ivory background, primary emerald, surface, border).
  - Normalisasi border radius dari `rounded-full` ke `rounded-2xl`.
- [x] `QuickActions.tsx`:
  - Hapus entri duplikat modul "Langganan".
  - Buang class CSS non-standar `text-success` / `bg-success/10`.
  - Rapikan grid desktop menjadi 6 modul simetris (Anggaran, Tagihan, Langganan, Hutang, Aset, Laporan).
  - Terapkan palet netral pada modul sesuai aturan `DESIGN.md` (tanpa warna pelangi sembarangan).
- [x] `BottomNav.tsx`:
  - Tambahkan modul "Langganan" ke dalam sheet navigasi mobile "Lainnya" agar fitur dapat diakses pengguna ponsel.
- [x] `SidebarNav.tsx`:
  - Selaraskan brand name di header sidebar menjadi "KasKeluarga" (bukan "KasPribadi").
- [x] `ScenarioSimulator.tsx`:
  - Bersihkan em dash (`—`) di UI menjadi tanda baca standar (`: `).
- [x] Verifikasi menyeluruh:
  - `npm run test:audit` lulus.
  - `npm run lint` lulus 0 error 0 warning.
  - `npm run build` lulus kompilasi.

## File yang Disentuh
- `src/components/landing/LandingView.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/SidebarNav.tsx`
- `src/components/evaluation/ScenarioSimulator.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Tidak ada lagi data/klaim palsu atau harga fiktif di landing page.
2. Modul "Langganan" dapat diakses dari mobile bottom sheet dan tidak terduplikasi di dashboard.
3. Grid QuickActions rapi 6 kolom tanpa warna pelangi acak.
4. `npm run test:audit`, `npm run lint`, dan `npm run build` lulus 100%.
5. Catatan rilis ditambahkan ke `changelog.md` dan status plan diubah menjadi `done`.
