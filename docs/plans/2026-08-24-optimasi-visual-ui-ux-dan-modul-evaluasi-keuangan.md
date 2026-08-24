# Plan: Peningkatan Visual UI/UX Modern & Modul Evaluasi Keuangan Lengkap

- Tanggal: 2026-08-24
- Status: done

## Tujuan
1. Meningkatkan estetika visual, UI, dan UX pada sidebar dan komponen antarmuka aplikasi menjadi jauh lebih elegan, bersih (*clean*), berdensitas pas (Apple/Linear-style), serta memperbaiki bug visual di mana dua menu aktif bersamaan.
2. Membangun modul lengkap **Evaluasi Keuangan & Skor Kesehatan Finansial (Financial Health Check & Score)** untuk mengevaluasi kondisi arus kas, rasio likuiditas, rasio beban hutang (DTI), rasio tabungan (*savings rate*), serta estimasi nilai kekayaan bersih (*Net Worth*).

## Ruang Lingkup
- [x] **Perbaikan & Polishing Visual Sidebar (UI/UX)**:
  - Pisahkan tab `evaluation` sebagai ID unik mandiri agar tidak terjadi *double active state* dengan `reports`.
  - Terapkan gaya navigasi modern: *active indicator* yang presisi (kontras tajam, latar pill lembut yang bersih), transisi hover halus, dan tipografi seksi yang profesional.
  - Tambahkan badge status atau skor visual ringkas.
- [x] **Modul & Halaman Evaluasi Keuangan (`EvaluationView.tsx`)**:
  - **Skor Kesehatan Finansial (0 - 100)** dengan indikator status: *Sangat Sehat*, *Stabil / Cukup*, atau *Perlu Evaluasi*.
  - **4 Metrik Rasio Keuangan Standar**:
    1. *Rasio Likuiditas & Dana Darurat* (Bulan pengeluaran yang ter-cover kas).
    2. *Rasio Beban Hutang terhadap Pendapatan (DTI %)*.
    3. *Rasio Tabungan / Investasi Bulanan (Savings Rate %)*.
    4. *Estimasi Kekayaan Bersih (Net Worth = Total Kas + Nilai Buku Aset - Total Sisa Hutang)*.
  - **Rekomendasi Cerdas & Analisis Kondisi**: Kotak saran otomatis berdasarkan rasio pengeluaran dan tabungan aktual pengguna.
- [x] **Integrasi Antarmuka**:
  - Daftarkan `evaluation` di `BottomNav.tsx`, `SidebarNav.tsx`, `QuickActions.tsx`, dan `src/app/page.tsx`.
- [x] **Pengujian & Verifikasi**:
  - `npm test` lulus, `npm run lint` 0 error/warning, `npm run build` sukses.

## File yang Disentuh
- `docs/plans/2026-08-24-optimasi-visual-ui-ux-dan-modul-evaluasi-keuangan.md`
- `src/components/layout/BottomNav.tsx`
- `src/components/layout/SidebarNav.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/evaluation/EvaluationView.tsx` [NEW]
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Tampilan sidebar memiliki state aktif tunggal yang presisi dan estetika modern tingkat tinggi.
2. Menu "Evaluasi Keuangan" membuka halaman Evaluasi Finansial lengkap dengan Skor Kesehatan, 4 rasio utama, Net Worth, dan saran aksi keuangan.
3. Seluruh unit test dan E2E test lulus 100%.
