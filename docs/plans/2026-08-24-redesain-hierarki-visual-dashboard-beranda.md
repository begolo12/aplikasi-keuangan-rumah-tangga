# Plan: Redesain Total Hierarki Visual & Layout Dashboard Beranda

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Memperbaiki hierarki visual, proporsi ukuran elemen, keseimbangan spasi (*optical balance*), dan tata letak (*layout*) pada halaman Beranda (Dashboard) agar tampak profesional, rapi, modern, dan tidak ada elemen yang patah baris atau canggung.

## Temuan Audit & Solusi Redesain
1. **Quick Actions (Aksi Cepat) Patah Baris**:
   - *Masalah*: 9 item aksi dimasukkan ke dalam grid 8-kolom sehingga item "Laporan" turun sendirian di baris kedua sebelah kiri.
   - *Solusi*: Restrukturisasi layout aksi cepat menjadi 2 kelompok yang sangat teratur:
     - **3 Aksi Transaksi Utama (Hero Buttons)**: 💸 *Catat Pengeluaran*, 💰 *Catat Pemasukan*, 🔄 *Transfer Kas* (berdesain tombol interaktif berbobot).
     - **Navigasi Cepat Modul**: Tombol pintas mini yang rapi (*Anggaran*, *Tagihan*, *Hutang*, *Aset*, *Laporan*, *Evaluasi*).
2. **Kartu Saldo Utama (Balance Header)**:
   - *Masalah*: Kotak hijau masif terlalu berat secara visual, teks "RUMAH TANGGA" sudah tidak relevan dengan KasPribadi, dan strip Safe-to-Spend berhimpitan di bawah.
   - *Solusi*: Terapkan kartu modern dengan gradien halus bernuansa *emerald/slate*, tipografi saldo rapi (`text-2xl sm:text-3xl font-extrabold tracking-tight`), badge status likuiditas elegan, dan tombol aksi terpadu.
3. **Kartu Pos Kas & Rekening (Wallet Scroller)**:
   - *Masalah*: Kartu dompet terlalu lebar dan kosong dengan tipografi datar.
   - *Solusi*: Redesain menjadi *modern account cards* dengan aksen warna jenis akun (Tunai, Bank, E-Wallet, Tabungan), badge akun utama, dan perataan angka tabular yang mantap.
4. **Ringkasan Arus Kas (Cash Flow Summary)**:
   - *Masalah*: 3 kartu ringkasan kaku dan terpisah-pisah.
   - *Solusi*: Gabungkan ke dalam satu strip metrik finansial terpadu (*3-column cashflow bar*) dengan indikator surplus/defisit dinamis dan warna kontras yang ramah mata.
5. **Daftar Transaksi Terbaru**:
   - *Masalah*: Search bar dan tombol filter tab kurang menyatu.
   - *Solusi*: Sejajarkan search bar dan filter segmented control dalam satu baris header yang rapi.

## Ruang Lingkup
- [x] Redesain [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx)
- [x] Redesain [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx)
- [x] Redesain [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx)
- [x] Redesain [WalletScroller.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/WalletScroller.tsx)
- [x] Sesuaikan komposisi tata letak di [src/app/page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx)
- [x] Jalankan verifikasi: `npm test`, `npm run lint`, `npm run build`.

## File yang Disentuh
- `docs/plans/2026-08-24-redesain-hierarki-visual-dashboard-beranda.md`
- `src/components/dashboard/BalanceHeader.tsx`
- `src/components/dashboard/QuickActions.tsx`
- `src/components/dashboard/MonthlySummary.tsx`
- `src/components/dashboard/WalletScroller.tsx`
- `src/app/page.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Tidak ada item aksi yang patah baris sendirian.
2. Hierarki visual saldo, arus kas, pos rekening, dan transaksi mengalir alami dari yang paling penting ke detail.
3. Seluruh unit test dan E2E test lulus 100%.
