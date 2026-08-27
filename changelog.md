# Changelog

Log eksekusi plan. Entri baru ditambahkan di bagian paling atas.
Format entri lihat `AGENTS.md` bagian "Langkah 3 — Catat ke Changelog".

## [2026-08-28] Fitur Smart Receipt & Nota Parser Menggunakan DeepSeek API

**Plan**: `docs/plans/2026-08-28-fitur-smart-receipt-parser-deepseek.md`

### Berubah
- **Engine DeepSeek Server-Isolated** (`src/lib/deepseek.ts` & `src/app/api/ai/parse-receipt/route.ts`): Menjalankan ekstraksi data transaksi belanja/nota/mutasi dari teks menggunakan model `deepseek-v4-flash`. API key tersimpan di variabel server (`DEEPSEEK_API_KEY`) tanpa prefix `NEXT_PUBLIC_` sehingga terisolasi aman dari client bundle dan dilindungi `.gitignore`. Dilengkapi fallback parser heuristik cerdas bila offline/unreachable.
- **Validasi Schema** (`src/lib/validations.ts`): Skema Zod baru `parseReceiptRequestSchema`, `receiptItemSchema`, dan `parsedReceiptResultSchema`.
- **Komponen Modal Scan Struk** (`src/components/transactions/ReceiptParserModal.tsx`): Pratinjau hasil ekstraksi (nominal total, tanggal, toko/merchant, rincian belanja, usulan kategori & dompet) dan tombol instan "Tempel Salinan" dari clipboard.
- **Integrasi Input Transaksi** (`TransactionModal.tsx` & `QuickActions.tsx`): Tombol "Scan Struk" disematkan di QuickActions dan form pencatatan transaksi untuk pengisian form otomatis dalam satu klik.
- **Testing & Proteksi**: Unit test audit parser + E2E test endpoint AI (termasuk verifikasi penolakan akses 401 unauthenticated).

### Verifikasi
- Build Next.js (`npm run build`) sukses tanpa error.
- Unit Audit (`npm run test:audit`) lulus 119/119 pengujian.
- E2E Full Suite (`npm run test:e2e`) lulus 52/52 pengujian.

### Dampak
- Tambahkan `DEEPSEEK_API_KEY`, `DEEPSEEK_BASE_URL`, dan `DEEPSEEK_MODEL` di Environment Variables project Vercel sebelum deploy produksi.

## [2026-08-27] Fitur Target Tabungan (Savings Goals)


**Plan**: `docs/plans/2026-08-27-fitur-target-tabungan-savings-goals.md`

### Berubah
- Tabel baru `savings_goals` + `goal_contributions` (migrasi + init idempotent). Progres goal TIDAK disimpan ganda: `saved_amount` dihitung dari SUM kontribusi, dan `UNIQUE(transaction_id)` menjamin satu transaksi kas hanya tercatat sekali.
- API `/api/goals` (GET list dengan proyeksi, POST), `/api/goals/[id]` (PUT/DELETE, DELETE menghapus progres tapi membiarkan transaksi kas nyata tetap ada), `/api/goals/[id]/contribute` (POST): alokasi membuat SATU transfer kas nyata ke dompet penampung (lock dua dompet urut UUID) lalu menautkan transaksi tersebut sebagai progres.
- Validasi baru `savingsGoalSchema` & `goalContributionSchema`.
- View baru `GoalsView` (card progres, modal buat/ubah/alokasi/hapus, proyeksi tanggal tercapai dari rata-rata kontribusi 90 hari). Dinamis diimpor; nav sidebar ("Target Tabungan") & bottom sheet ("Target") ditambahkan.
- Ringkasan goals masuk bootstrap sengaja dilewatkan demi query hemat; view melakukan fetch mandiri seperti modul lain. Dicatat sebagai penyimpangan ruang lingkup kecil.

### Verifikasi
- Build lulus; lint 0 error; 113 audit unit + 48 E2E lulus termasuk 5 skenario goals baru (buat, alokasi atomik, tautan transaksi, saldo dompet bergerak, isolasi lintas-user).

### Dampak
- Jalankan `npx tsx scripts/run-db-migrations.ts` pada DB lama sebelum deploy.

## [2026-08-27] Rombak Identitas Visual Edisi Klasik Rumah

**Plan**: `docs/plans/2026-08-27-rombak-identitas-visual-klasik-rumah.md` | Direction: `DESIGN.md`

### Berubah
- **Token warna baru** (`globals.css`, light + dark): ivory/porselen bg ramp, emerald tua `primary` (dengan varian `deep` untuk gradient hero), terracotta `expense`, hijau lumut `income`, biru-abu laut `transfer`, amber gelap `warning`. Semua nilai digerakkan agar teks lulus AA di atas permukaannya; theme-color meta ikut diperbarui.
- **Motif identitas**: font serif display (Fraunces, self-contained via next/font) + utility `.font-display-num` khusus angka besar. Diterapkan pada: kartu saldo & safe-to-spend (BalanceHeader), tiga angka total MonthlySummary, angka utama Neraca/P&L/Arus Kas.
- **Palet modul disederhanakan** ke 3 core + semantik: ikon modul BottomNav/Lainnya jadi netral (aktif = primary); QuickActions kini memakai token semantik (warning/primary/expense/income/transfer) bukan pelangi hardcoded; AssetsView, BillItem, DebtItem, DebtCalculatorModal, BudgetProgressBar, FinancialSafetyPlanCard, EmergencyFundCard, OfflineBanner, BalanceSheetReport, ColdMoneyCard sama halnya; badge "Baru" di sidebar dihapus (bukan status nyata).
- **Ikon generik dibuang**: Sparkle diganti ikon kontekstual (Coins/Drop/PiggyBank/Gauge).
- **Em dash dihapus dari semua teks UI** (R-02): metadata title, chip tren, opsi select depresiasi, banner offline, placeholder cicilan.
- Gradient hero memakai token (`from-primary via-primary-hover to-primary-deep`) tanpa hex hardcode.

### Verifikasi
- Build lulus; lint 0 error (11 warning gaya sisa, dipilih biarkan); 113 audit unit + 43 E2E lulus.

## [2026-08-27] Kartu Putusan Akhir Bulan di Evaluasi

**Plan**: `docs/plans/2026-08-27-kartu-putusan-akhir-bulan.md`

### Berubah
- Modul baru `src/lib/decisionSummary.ts` (pure, teruji): membentuk tiga baris putusan dari angka riil (arus kas naik/turun, pos belanja lewat batas terbesar, ketersediaan uang dingin) plus maksimal satu saran aksi.
- Komponen baru `DecisionCard` (ikon per baris relevan: arah tren, status batas, status dana) diletakkan paling atas halaman Evaluasi.
- Data uang dingin memakai ulang `calculateColdMoney` tanpa agregasi duplikat; pos renteng diambil dari budgets real-time.
- Semua kondisi rapi: bulan kosong menghasilkan putusan "belum ada data" tanpa aksi fiktif.

### Verifikasi
- Build lulus; 113 audit unit + 43 E2E lulus (7 assertion pembentuk putusan baru).

## [2026-08-27] Paket Kepercayaan Data: Rekonsiliasi Basi, Tanda Revisi, Pengingat Backup

**Plan**: `docs/plans/2026-08-27-paket-kepercayaan-data-rekonsiliasi-revisi-backup.md`

### Berubah
- **Rekonsiliasi basi**: helper baru `getReconcileAge` (formatters, pure & teruji); kartu dompet di dashboard dan halaman Dompet menampilkan status peringatan bila belum pernah direkonsiliasi atau lebih dari 14 hari ("Cek saldo" + ikon warning). Hard-coded amber di ganti token `warning`.
- **Tanda revisi**: kolom DB `transactions.edited_at` (migrasi + init idempotent); handler PUT mengisinya; API list transaksi dan bootstrap memuat field; `TransactionItem` menampilkan ikon pensil kecil + tooltip tanggal revisi.
- **Backup**: kartu Cadangan di Pengaturan menyimpan timestamp unduhan terakhir (localStorage) dan menampilkan usia cadangan; kalimat saran muncul bila > 30 hari. Nudge ringan di dashboard dengan tombol Unduh/Tutup (muncul bila cadangan lama/belum ada).
- Hard-coded warna pengingat pemulihan diganti token `warning`.

### Verifikasi
- Build lulus; 106 audit unit + 43 E2E lulus (3 assertion getReconcileAge + 1 skenario edited_at).

### Dampak
- Jalankan `npx tsx scripts/run-db-migrations.ts` pada DB lama sebelum deploy.

## [2026-08-27] Optimalisasi Input, Flow & Sinkronisasi Data (Integritas Uang)

**Plan**: `docs/plans/2026-08-27-optimalisasi-input-flow-sync-data.md`

### Berubah
- **Bootstrap gagal keras**: seluruh `.catch(() => [])` dihapus; kegagalan sub-query kini memicu error state di dashboard (banner Coba lagi yang sudah ada), bukan angka Rp0 palsu.
- **Bug safe-to-spend**: kewajiban piutang/hutang hanya dihitung bila jatuh tempo bulan ini, terlewat, atau tanpa tanggal (kolom SQL `is_due_this_period`); hutang tenor panjang seperti KPR tidak lagi menekan dana bebas belanja bulan ini.
- **Query sargable**: semua filter `EXTRACT(MONTH/YEAR)` diganti rentang `make_date(...)+INTERVAL '1 month'` agar index terpakai.
- **Antrean offline** (`offlineQueue.ts`): `persistAttempt` atomik (put-first, bukan delete-then-put) sehingga crash tidak menghilangkan mutasi; drain lintas-tab eksklusif via `navigator.locks`; timeout kirim 15 detik per item.
- **Anti-replay revisi basi**: PUT `/api/transactions/[id]` menerima `expected_updated_at`, menolak 409 bila baris lebih baru; form edit mengirimkannya otomatis.
- **Form**: double-submit guard sinkron via `useRef`; submit transaksi memakai `apiFetch`; semua request client punya timeout 15 detik default.
- **Hapus offline**: DELETE diblokir saat offline dengan pesan jelas, bukan gagal senyap.
- **Kontrol**: bottom sheet "Lainnya" bisa ditutup Escape + fokus balik ke trigger, outside tap memakai pointerdown; segmented control tipe transaksi, chip saran & preset nominal menjadi min-h 44px.
- Multi-device: refresh otomatis saat tab kembali fokus (debounce 5s); mapping PG `wallets_balance_nonnegative` yang sudah mati dihapus dari apiHelpers.

### Verifikasi
- Build lulus; 103 audit unit + 42 E2E lulus termasuk 2 skenario baru (PUT replay basi ditolak & data utuh).

## [2026-08-27] Fitur Pencatatan Hutang Detail KPR, Bunga, Tenor & Cicilan

**Plan**: `docs/plans/2026-08-27-fitur-pencatatan-hutang-detail-kpr-bunga-dan-cicilan.md`

### Berubah
- Tabel `debts` bertambah kolom `category`, `principal_amount`, `interest_rate`, `interest_type`, `tenor_months`, `monthly_installment`, `total_interest` (migrasi + init idempotent).
- API `/api/debts`: GET/POST menyertakan detail pinjaman; POST menghitung total bunga otomatis dan dapat membuat jadwal cicilan otomatis ke `recurring_bills` (`auto_schedule_bill`).
- Bootstrap dashboard memuat rincian hutang lengkap.
- Form di `DebtsView.tsx`: pemilihan kategori pinjaman (KPR/kendaraan/bank), mode input rinci dengan kalkulator cicilan live (bunga flat), opsi auto-jadwal. `DebtItem.tsx` menampilkan strip rincian pokok/bunga/cicilan.
- E2E baru `[7b]`: post handler KPR, verifikasi total bunga Rp 150jt, verifikasi tagihan rutin terjadwal Rp 3.75jt; kontrak safe-to-spend diperbarui.

### Dampak
- Menjalankan `npx tsx scripts/run-db-migrations.ts` diperlukan pada DB lama sebelum deploy.
- Verifikasi: build lulus, 103 audit unit + 40 E2E lulus.

## [2026-08-27] Sinkronisasi AGENTS.md dengan Kebijakan Overdraft

Tanpa plan doc (perubahan satu baris dokumentasi).

### Berubah
- [AGENTS.md](AGENTS.md): aturan saldo dompet strict-zero diganti menjadi kebijakan overdraft, menyusul pelepasan constraint di plan `2026-08-27-fitur-saldo-minus-laporan-dana-darurat-otomatisasi-dan-kalkulator-hutang`. Dokumentasi kini selaras dengan `walletSchema` dan E2E test.

## [2026-08-27] Audit Aplikasi & Fix Lint Error Modal (Ref Sync Saat Render)

Tanpa plan doc (perbaikan lint satu titik tanpa mengubah perilaku).

### Berubah
- [Modal.tsx](src/components/ui/Modal.tsx): pindahkan sinkronisasi `onCloseRef.current = onClose` dari badan render ke `useEffect([onClose])` agar tidak melanggar aturan React `react-hooks/refs` (Cannot update ref during render).
- Bersihkan cache `.next/dev/types` yang basi dan membuat `npm run build` gagal type-check.

### Verifikasi
- `npm run build` lulus, `npm run lint` 0 error (sisa 10 warning gaya), `npm test` 103 audit + 37 E2E lulus.

## [2026-08-27] Perbaikan Bug Modal Keluar/Tertutup Sendiri Saat Mengetik (Focus Trap & Effect Cleanup Refactor)

**Plan**: `docs/plans/2026-08-27-fix-modal-auto-close-dan-focus-trap-bug.md`

### Berubah
- **Refactoring Focus Trap & State Isolation pada Modal**:
  - Menyimpan referensi `onClose` menggunakan `useRef` pada [Modal.tsx](src/components/ui/Modal.tsx) sehingga perubahan callback dari parent saat user mengetik karakter tidak memicu re-running `useEffect` dan cleanup yang melempar fokus ke luar modal.
  - Memastikan auto-focus ke input pertama hanya dijalankan satu kali saat modal pertama kali dibuka.
  - Memperkuat proteksi backdrop click (`e.target === e.currentTarget`) dan `stopPropagation` pada container modal agar sentuhan dan interaksi form tidak bocor ke backdrop.
  - Menstabilkan mounting form pada [TransactionModal.tsx](src/components/transactions/TransactionModal.tsx).
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Audit & Perbaikan Sinkronisasi Anggaran Bulanan (Auto Carry-Forward & Live Real-Time Spent)

**Plan**: `docs/plans/2026-08-27-audit-dan-perbaikan-sinkronisasi-anggaran-bulanan.md`

### Berubah
- **Mekanisme Auto Carry-Forward Anggaran Antar-Bulan**:
  - Memperbarui query pada [budgets/route.ts](src/app/api/budgets/route.ts), [dashboard/bootstrap/route.ts](src/app/api/dashboard/bootstrap/route.ts), dan [reports/monthly/route.ts](src/app/api/reports/monthly/route.ts) menggunakan CTE `DISTINCT ON (category_id) ... ORDER BY category_id, year DESC, month DESC`.
  - Anggaran belanja yang telah ditetapkan otomatis aktif dan terbawa ke bulan-bulan berikutnya tanpa perlu input ulang manual setiap awal bulan.
  - Perhitungan `spent` (realisasi pengeluaran) dan `percentage` (%) dihitung secara dinamis dan presisi sesuai transaksi pengeluaran pada bulan dan tahun yang sedang dibuka pengguna.
- **Sinkronisasi Metrik Terikat**:
  - Menjamin perhitungan Dana Darurat ($4\times$), Cadangan Risiko ($10\%$), Proyeksi Pengeluaran Bulanan, dan Rasio DER/Likuiditas selalu sinkron dan konsisten di seluruh periode waktu.
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Penghapusan Pintasan Cepat Keyboard Global

**Plan**: `docs/plans/2026-08-27-hapus-pintasan-cepat-keyboard-global.md`

### Berubah
- **Menghapus Global Keyboard Shortcut Listener**:
  - Menghapus listener `keydown` (tombol `E`, `N`, `I`, `T`) dari [AppShell.tsx](src/components/layout/AppShell.tsx) sehingga saat pengguna mengetik teks/form transaksi tidak ada lagi popup yang muncul tiba-tiba.
  - Menghapus kartu informasi "Pintasan Cepat" dari sidebar [SidebarNav.tsx](src/components/layout/SidebarNav.tsx).
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Penyempurnaan Bahasa Laporan Keuangan Keluarga (Human-Friendly Tone)

**Plan**: `docs/plans/2026-08-27-penyempurnaan-bahasa-laporan-keuangan-keluarga.md`

### Berubah
- **Penyederhanaan Istilah Korporat Bisnis menjadi Istilah Keluarga**:
  - Mengubah istilah kaku "Laba Rugi (P&L)" menjadi **"Laporan Pemasukan & Belanja (Surplus/Defisit)"** pada [IncomeStatementReport.tsx](src/components/reports/IncomeStatementReport.tsx) dan [ReportsView.tsx](src/components/reports/ReportsView.tsx).
  - Mengubah "Laba Bersih / Operating Surplus" menjadi **"Sisa Uang / Surplus Bersih Keluarga"**.
  - Mengubah "Beban Kas Operasional" menjadi **"Belanja Hidup & Tagihan Rutin"**.
  - Mengubah "Beban Non-Kas Depresiasi" menjadi **"Penyusutan Nilai Barang/Aset"**.
  - Mengubah istilah "Aktiva & Pasiva" menjadi **"Daftar Harta & Kekayaan (Aset)"** dan **"Kewajiban Hutang & Kekayaan Bersih"** pada [BalanceSheetReport.tsx](src/components/reports/BalanceSheetReport.tsx).
  - Mengubah istilah "Capital Gain / Loss" menjadi **"Hasil Penjualan Untung (+)"** dan **"Hasil Penjualan Menyusut (-)"** pada [SellAssetModal.tsx](src/components/assets/SellAssetModal.tsx).
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Laporan Rasio Keuangan (DER, DAR, DSR, Likuiditas) dan Kesimpulan Analisis

**Plan**: `docs/plans/2026-08-27-fitur-laporan-rasio-keuangan-der-dan-kesimpulan-analisis.md`

### Berubah
- **Kalkulasi 6 Rasio Keuangan Utama**:
  - Mengimplementasikan helper `calculateFinancialRatios` pada [FinancialRatiosReport.tsx](src/components/reports/FinancialRatiosReport.tsx) yang menghitung:
    1. **DER (Debt to Equity Ratio)**: Rasio Hutang terhadap Modal/Kekayaan Bersih ($\le 35\%$ aman).
    2. **DAR (Debt to Asset Ratio)**: Rasio Hutang terhadap Total Aset ($\le 30\%$ aman).
    3. **DSR / DTI (Debt Service Ratio)**: Rasio Beban Cicilan terhadap Pemasukan ($\le 20\%$ aman).
    4. **Liquidity Ratio**: Rasio Ketahanan Kas Likuid ($\ge 4.4$ bulan aman).
    5. **Savings Ratio**: Rasio Tabungan terhadap Pemasukan ($\ge 20\%$ aman).
    6. **OER (Operating Expense Ratio)**: Efisiensi Biaya Operasional ($\le 70\%$ aman).
- **Skor Finansial & Kesimpulan Naratif Otomatis**:
  - Menghitung skor kesehatan finansial (0-100) dan menghasilkan kesimpulan naratif eksekutif yang menjelaskan kondisi keuangan secara jelas (Sangat Sehat, Stabil, Waspada, atau Kritis) serta rekomendasi langkah tindakan nyata.
- **Integrasi di Menu Laporan & Evaluasi**:
  - Menambahkan sub-tab **"Rasio (DER dll)"** pada [ReportsView.tsx](src/components/reports/ReportsView.tsx).
  - Memperbarui [EvaluationView.tsx](src/components/evaluation/EvaluationView.tsx) agar kartu rasio dan scoring kesehatan mengadopsi indikator DER.
- **Verifikasi**:
  - 103 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Uang Dingin (Cold Money) dan Dana Bebas Rencana Jangka Pendek

**Plan**: `docs/plans/2026-08-27-fitur-uang-dingin-dan-dana-bebas-rencana-jangka-pendek.md`

### Berubah
- **Perhitungan Alokasi Uang Dingin**:
  - Mengimplementasikan helper `calculateColdMoney` pada [ColdMoneyCard.tsx](src/components/reports/ColdMoneyCard.tsx) yang menghitung kelebihan kas riil yang benar-benar bebas dari seluruh alokasi wajib:
    $$\text{Uang Dingin} = \max(0, \text{Total Kas Likuid} - \text{Cadangan Wajib 4.4x Anggaran} - \text{Kewajiban Tagihan/Hutang})$$
- **Kartu Khusus Uang Dingin di Menu Laporan & Dashboard**:
  - Menampilkan [ColdMoneyCard.tsx](src/components/reports/ColdMoneyCard.tsx) di menu Laporan ([ReportsView.tsx](src/components/reports/ReportsView.tsx)) dengan rincian 4 kolom: **Total Kas Riil**, **Cadangan 4.4x Anggaran**, **Tagihan & Hutang**, dan **Uang Dingin (Bebas Pakai)** beserta rekomendasi pemanfaatan untuk investasi jangka pendek, liburan, hobi, atau modal baru.
  - Memperbarui [BalanceHeader.tsx](src/components/dashboard/BalanceHeader.tsx) pada Dashboard agar menampilkan indikator status "Dana Bebas & Uang Dingin".
- **Verifikasi**:
  - 96 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Laporan Keuangan Lengkap: Neraca Keuangan Keluarga (Balance Sheet) & Laba Rugi

**Plan**: `docs/plans/2026-08-27-fitur-laporan-keuangan-lengkap-neraca-dan-laba-rugi.md`

### Berubah
- **Neraca Keuangan Keluarga (Balance Sheet)**:
  - Membuat komponen [BalanceSheetReport.tsx](src/components/reports/BalanceSheetReport.tsx) yang menyajikan kalkulasi formal posisi keuangan:
    - **Aktiva (Harta)**: Aset Kas Likuid + Piutang Belum Diterima + Aset Tetap/Harta Berharga (Taksiran Pasar / Nilai Buku).
    - **Pasiva (Kewajiban & Ekuitas)**: Liabilitas Jangka Pendek (Tagihan) + Hutang Pinjaman Aktif + Ekuitas/Kekayaan Bersih (*Net Worth*).
    - Seimbang (*Balanced*): $\text{Total Aktiva} = \text{Total Pasiva}$.
- **Laporan Laba Rugi Komprehensif (Income Statement / P&L)**:
  - Membuat komponen [IncomeStatementReport.tsx](src/components/reports/IncomeStatementReport.tsx) yang memperhitungkan Pendapatan Total vs Beban Kas Hidup vs Beban Non-Kas (Penyusutan Nilai Aset) untuk menghasilkan Laba/Surplus Bersih Komprehensif.
- **Desain Adaptif (Mobile Simple vs PC Full Data)**:
  - **Di Handphone (Mobile)**: Tampilan bersih (*glanceable*) dengan kartu kesimpulan instan apakah kondisi keuangan **Baik (Sehat)** atau **Jelek/Waspada (Defisit)**, 3 angka inti (Total Harta, Total Hutang, Kekayaan Bersih), dan rasio solvabilitas.
  - **Di PC (Desktop)**: Format neraca akuntansi berpasangan (*two-column balanced statement*), tabel rincian akun, dan ekspor CSV.
- **Navigasi 4 Pilar Laporan di ReportsView**:
  - Mengintegrasikan 4 sub-tab pada [ReportsView.tsx](src/components/reports/ReportsView.tsx): **Ringkasan & Kategori**, **Arus Kas (Cashflow)**, **Neraca Keuangan**, dan **Laba Rugi (P&L)**.
- **Verifikasi**:
  - 91 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Tampilan Riwayat Kapan Rekonsiliasi Terakhir pada Kartu Dompet

**Plan**: `docs/plans/2026-08-27-fitur-tampilan-riwayat-kapan-rekonsiliasi-terakhir-di-dompet.md`

### Berubah
- **Informasi Tanggal Rekonsiliasi Terkini di Kartu Pos Kas**:
  - Menambahkan label status dan tanggal rekonsiliasi terakhir (contoh: `Rekom: 27 Agu 2026` atau `Belum pernah direkom` dengan indikator titik hijau/kuning) pada kartu pos dompet di [WalletsView.tsx](src/components/wallets/WalletsView.tsx).
  - Menambahkan baris informasi rekonsiliasi terakhir pada kartu ringkasan pos kas di beranda Dashboard [WalletScroller.tsx](src/components/dashboard/WalletScroller.tsx).
- **Verifikasi**:
  - 91 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Otomatisasi Pembelian Aset, Jadwal Pajak, dan Perawatan Rutin/Insidental

**Plan**: `docs/plans/2026-08-27-fitur-otomatisasi-pembelian-aset-jadwal-pajak-dan-maintenance.md`

### Berubah
- **Sinkronisasi Atomik Pembelian Aset & Transaksi Kas**:
  - Menambahkan kolom `asset_id` (foreign key) pada tabel `transactions` dan `recurring_bills`.
  - Pada [TransactionModal.tsx](src/components/transactions/TransactionModal.tsx), saat mencatat pengeluaran pembelian barang berharga, terdapat opsi centang **"Catat transaksi ini ke Daftar Aset & Depresiasi"** yang secara atomik mendaftarkan aset baru.
  - Pada [AssetModal.tsx](src/components/assets/AssetModal.tsx), terdapat opsi **"Catat pengeluaran kas pembelian dari dompet"** sehingga mutasi kas dan pencatatan aset langsung sinkron tanpa perlu input ganda.
- **Jadwal Pajak, Servis Rutin & Biaya Insidental Aset**:
  - Membuat modal [AssetScheduleModal.tsx](src/components/assets/AssetScheduleModal.tsx) di [AssetsView.tsx](src/components/assets/AssetsView.tsx) dengan tombol aksi cepat **"Jadwal / Biaya"** pada setiap kartu aset.
  - Mendukung pembuatan **Jadwal Pajak Rutin** (Pajak STNK / PBB) dan **Servis Berkala** yang otomatis terjadwal ke daftar **Pengeluaran Pasti Rutin (`recurring_bills`)** dan terhitung dalam Rencana Anggaran.
  - Mendukung pencatatan **Biaya Insidental (Perbaikan/Kerusakan Tak Terduga)** yang langsung memotong saldo kas dompet dan menautkan riwayat biaya ke aset terkait.
- **Verifikasi**:
  - 89 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Taksiran Harga Pasar Aset & Analisis Plus / Minus Depresiasi

**Plan**: `docs/plans/2026-08-27-fitur-taksiran-harga-pasar-aset-dan-analisis-plus-minus.md`

### Berubah
- **Inputan Taksiran Harga Pasar Terkini**:
  - Menambahkan input field "Taksiran Harga Pasaran Saat Ini (Rp)" pada formulir aset [AssetModal.tsx](src/components/assets/AssetModal.tsx) untuk mencatat estimasi nilai jual/pasar riil saat ini (misal taksiran pasar motor, laptop, emas, properti).
- **Perhitungan & Analisis Plus (+) vs Minus (-)**:
  - Memperbarui fungsi `calculateAssetDepreciation` pada [assets/route.ts](src/app/api/assets/route.ts) untuk menghitung selisih antara Taksiran Pasar terhadap Harga Beli Awal (`market_diff_purchase`) dan terhadap Nilai Buku Akuntansi (`market_diff_book`).
  - Menghitung persentase perubahan nilai serta menentukan status apakah aset mengalami kenaikan nilai/apresiasi (**Plus**) atau penurunan nilai/depresiasi (**Minus**).
- **Visualisasi Pada Kartu Aset**:
  - Setiap kartu aset pada [AssetsView.tsx](src/components/assets/AssetsView.tsx) kini menyajikan 3 metrik perbandingan: **Harga Beli Awal**, **Nilai Buku Susut**, dan **Taksiran Pasar**, lengkap dengan badge status `Plus (+Rp X)` atau `Minus (-Rp X)`.
- **Verifikasi**:
  - 89 assertion audit unit test + 37 pengujian E2E lulus 100%.

## [2026-08-27] Laporan Khusus Cashflow, Indikator Surplus/Defisit, dan Status Efisiensi Rencana

**Plan**: `docs/plans/2026-08-27-fitur-laporan-cashflow-status-surplus-defisit-dan-efisiensi-rencana.md`

### Berubah
- **Indikator Status Surplus vs Defisit Instan**:
  - Memperbarui [MonthlySummary.tsx](src/components/dashboard/MonthlySummary.tsx) dengan badge kontras tinggi "Kondisi Surplus" vs "Kondisi Defisit" pada tampilan mobile dan desktop sehingga status keuangan bulan berjalan langsung terbaca sekilas.
- **Indikator Efisiensi vs Inefisiensi Rencana Anggaran**:
  - Memperbarui [ExpenseProjectionCard.tsx](src/components/budget/ExpenseProjectionCard.tsx) dengan status "Efisien (Hemat X%)" vs "Inefisien (Boros/Overbudget X%)" yang membandingkan proyeksi akhir bulan terhadap rencana awal.
- **Modul Laporan Khusus Cashflow (Cashflow Statement)**:
  - Membuat komponen [CashflowStatement.tsx](src/components/reports/CashflowStatement.tsx) yang terintegrasi pada [ReportsView.tsx](src/components/reports/ReportsView.tsx) via sub-tab navigasi.
  - Tampilan **Handphone (Mobile)** dibuat ringkas (*clean & glanceable 3-column strip*) memuat Total Kas Masuk, Total Kas Keluar, dan Arus Kas Bersih.
  - Tampilan **PC (Desktop Full Data)** menyajikan tabel lengkap rekonsiliasi kas: Saldo Awal Periode, Arus Kas Operasional Masuk/Keluar, Mutasi Transfer Internal, Kenaikan/Penurunan Bersih, dan Saldo Akhir Periode.
- **Verifikasi**:
  - 86 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Proyeksi Pengeluaran Bulanan (Monthly Expense Projection)

**Plan**: `docs/plans/2026-08-27-fitur-proyeksi-pengeluaran-bulanan.md`

### Berubah
- **Kalkulasi Proyeksi Pengeluaran (Realisasi + Sisa Estimasi)**:
  - Membuat fungsi helper `calculateExpenseProjection` pada [ExpenseProjectionCard.tsx](src/components/budget/ExpenseProjectionCard.tsx) untuk menghitung proyeksi total biaya akhir bulan ($\text{Realisasi Terkini} + \text{Sisa Kebutuhan Riil}$) dan membandingkannya dengan Rencana Anggaran Awal.
  - Menghitung potensi penghematan/surplus biaya jika biaya berjalan tidak sebesar rencana awal (contoh: rencana Rp 1,5 jt, realisasi Rp 1 jt + sisa Rp 300 rb = proyeksi Rp 1,3 jt / hemat Rp 200 rb).
- **Komponen Visual & Penyesuaian Interaktif**:
  - Membuat komponen [ExpenseProjectionCard.tsx](src/components/budget/ExpenseProjectionCard.tsx) di menu Anggaran ([BudgetView.tsx](src/components/budget/BudgetView.tsx)) lengkap dengan rincian 4 metrik, progress bar bertingkat, dan form inline untuk menyesuaikan perkiraan sisa biaya riil.
  - Menambahkan indikator proyeksi akhir bulan pada [ReportsView.tsx](src/components/reports/ReportsView.tsx).
- **Verifikasi**:
  - 86 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Rekonsiliasi Saldo Rekening Riil (Real Account Reconciliation)

**Plan**: `docs/plans/2026-08-27-fitur-rekonsiliasi-saldo-rekening-riil.md`

### Berubah
- **Skema & API Rekonsiliasi Dompet**:
  - Menambahkan kolom `reconciled_at` (timestamp) dan `last_reconciled_balance` (numeric) pada tabel `wallets`.
  - Membuat endpoint API [wallets/[id]/reconcile/route.ts](src/app/api/wallets/[id]/reconcile/route.ts) untuk membandingkan saldo sistem dengan saldo riil bank/kas fisik, menghitung selisih, dan membuat transaksi penyesuaian otomatis (`income` jika saldo fisik lebih banyak, `expense` jika saldo fisik lebih sedikit karena lupa catat).
- **Modal Rekonsiliasi & Analisis Selisih**:
  - Membuat komponen [ReconcileModal.tsx](src/components/wallets/ReconcileModal.tsx) dengan deteksi selisih otomatis, analisis penyebab (kelebihan pemasukan/bunga vs lupa catat belanja/biaya admin), dan sakelar penyesuaian otomatis (*auto-adjust*).
  - Menambahkan tombol aksi cepat "Rekonsiliasi" pada setiap kartu pos kas di [WalletsView.tsx](src/components/wallets/WalletsView.tsx).
- **Verifikasi**:
  - 80 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Resume Rencana Keuangan: Cadangan Biaya 4 Bulan dan Cadangan Risiko 10%

**Plan**: `docs/plans/2026-08-27-fitur-resume-rencana-cadangan-4-bulan-dan-resiko-10-persen.md`

### Berubah
- **Perhitungan Rencana Keamanan & Cadangan Risiko**:
  - Mengimplementasikan helper kalkulasi `calculateFinancialSafetyPlan` pada [FinancialSafetyPlanCard.tsx](src/components/budget/FinancialSafetyPlanCard.tsx) yang menghitung:
    1. Cadangan Biaya 4 Bulan ($4 \times \text{Anggaran}$).
    2. Cadangan Risiko 10% ($10\% \times \text{Cadangan 4 Bulan} = 0.4 \times \text{Anggaran}$).
    3. Total Syarat Minimum Dana Keamanan ($4.4 \times \text{Anggaran Bulanan}$).
    4. Saldo cadangan saat ini, progres persentase, dan nominal kekurangan.
- **Aturan KPI Penambahan Pengeluaran (Budget Expansion Guard)**:
  - Menerapkan aturan wajib: Pengguna harus memiliki uang cadangan minimal sebesar total syarat keamanan ($4.4 \times \text{Anggaran}$) sebelum boleh menambah pos pengeluaran atau menaikkan limit anggaran baru.
  - Pada form penetapan anggaran [BudgetView.tsx](src/components/budget/BudgetView.tsx), sistem menampilkan badge status "Terkunci: Wajib Punya Cadangan Dulu" serta pesan peringatan risiko jika syarat minimum belum tercapai.
- **Visualisasi Komprehensif di Modul Anggaran & Evaluasi**:
  - Menampilkan kartu visual [FinancialSafetyPlanCard.tsx](src/components/budget/FinancialSafetyPlanCard.tsx) di menu Anggaran dengan rincian 4 metrik, progres bar, dan rekomendasi aksi finansial.
  - Memperbarui [EvaluationView.tsx](src/components/evaluation/EvaluationView.tsx) agar skor kesehatan dan rasio cadangan mengacu pada ambang batas 4.4x anggaran.
- **Verifikasi**:
  - 78 assertion audit unit test + 35 pengujian E2E lulus 100%.

## [2026-08-27] Fitur Saldo Minus, Laporan Bulanan, Dana Darurat 4x Anggaran, Otomatisasi Transaksi Rutin, dan Kalkulator Insight Hutang

**Plan**: `docs/plans/2026-08-27-fitur-saldo-minus-laporan-dana-darurat-otomatisasi-dan-kalkulator-hutang.md`

### Berubah
- **Dukungan Saldo Minus (Overdraft)**:
  - Melepas batasan database constraint `wallets_balance_nonnegative` dari tabel `wallets` pada migrasi live DB.
  - Memperbarui validasi Zod [validations.ts](src/lib/validations.ts) agar `walletSchema.balance` menerima nilai negatif.
  - Menghapus pembatasan error "Saldo tidak mencukupi" pada rute [transactions/route.ts](src/app/api/transactions/route.ts), [transactions/[id]/route.ts](src/app/api/transactions/[id]/route.ts), [debts/[id]/pay/route.ts](src/app/api/debts/[id]/pay/route.ts), dan [bills/[id]/pay/route.ts](src/app/api/bills/[id]/pay/route.ts) sehingga dompet kas dapat bernilai minus saat pengeluaran melampaui saldo.
  - Menambahkan styling visual saldo minus dengan aksen teks merah dan label indikator minus/overdraft pada [WalletsView.tsx](src/components/wallets/WalletsView.tsx), [WalletScroller.tsx](src/components/dashboard/WalletScroller.tsx), [BalanceHeader.tsx](src/components/dashboard/BalanceHeader.tsx), dan [TransactionModal.tsx](src/components/transactions/TransactionModal.tsx).
- **KPI Dana Darurat (Aturan Wajib 4x Anggaran)**:
  - Mengimplementasikan aturan KPI keamanan keuangan di mana target Dana Darurat dihitung 4 × Total Anggaran Bulanan.
  - Membuat komponen visual [EmergencyFundCard.tsx](src/components/budget/EmergencyFundCard.tsx) di menu Anggaran ([BudgetView.tsx](src/components/budget/BudgetView.tsx)) dengan indikator status otomatis "Keuangan Aman" (jika saldo dana darurat >= 4x anggaran) vs "Keuangan Belum Aman" (jika belum mencapai 4x anggaran), progres bar, dan nominal kekurangan yang harus dikumpulkan.
  - Memperbarui modul Evaluasi Finansial [EvaluationView.tsx](src/components/evaluation/EvaluationView.tsx) agar skor kesehatan dan rekomendasi keuangan mengadopsi standar KPI 4x anggaran.
- **Transaksi Rutin & Pasti Otomatis (Pemasukan & Pengeluaran Pasti)**:
  - Memperluas tabel `recurring_bills` dengan kolom `type` (`expense` | `income`) dan `auto_record` (boolean) untuk membedakan Pemasukan Pasti (Gaji, Bonus, dll) dan Pengeluaran Pasti (Listrik, Air, Wi-Fi, Cicilan Hutang).
  - Membuat endpoint API [bills/auto-process/route.ts](src/app/api/bills/auto-process/route.ts) untuk eksekusi otomatis 1-klik seluruh transaksi rutin periode aktif.
  - Memperbarui [BillsView.tsx](src/components/bills/BillsView.tsx), [BillItem.tsx](src/components/bills/BillItem.tsx), dan [useBillForm.ts](src/components/bills/useBillForm.ts) dengan filter tab (Semua, Pengeluaran Pasti, Pemasukan Pasti), tombol "Catat Otomatis", dan modal transaksi rutin fleksibel.
- **Kalkulator & Simulator Hutang dengan Insight Keamanan Finansial (KPI)**:
  - Membuat komponen modal [DebtCalculatorModal.tsx](src/components/debts/DebtCalculatorModal.tsx) di [DebtsView.tsx](src/components/debts/DebtsView.tsx) untuk menghitung simulasi cicilan pinjaman (pokok, tenor, suku bunga/margin).
  - Menyediakan analisis kesimpulan KPI: menghitung rasio Debt-to-Income (DTI / DSR), sisa arus kas bulanan pasca cicilan, serta dampak terhadap target Dana Darurat 4x Anggaran dengan badge status "Keuangan Aman", "Perlu Waspada", atau "Sangat Berisiko / Defisit".
  - Menyediakan tombol 1-klik untuk menyimpan pinjaman langsung ke daftar hutang aktif sekaligus menjadwalkan cicilan rutin ke daftar pengeluaran pasti.
- **Penyempurnaan Laporan Bulanan (ReportsView)**:
  - Menambahkan navigasi pemilih periode bulan & tahun pada [ReportsView.tsx](src/components/reports/ReportsView.tsx) sehingga pengguna leluasa memeriksa laporan tiap bulan.
  - Menambahkan tabel Riwayat Perbandingan 4 Bulan Terakhir untuk memantau tren pemasukan, pengeluaran, dan arus kas bersih antar-bulan.
  - Memastikan ekspor CSV dan visualisasi grafik terhubung dengan bulan yang dipilih.

### Dampak
- Saldo dompet kini dapat bernilai minus (misal akun kas/rekening overdraft), tidak ada lagi pemblokiran transaksi akibat saldo tidak cukup.
- Seluruh 71 unit test audit dan 35 pengujian E2E lulus tanpa error.

**Plan**: `docs/plans/2026-08-25-audit-perbaikan-tampilan-mobile-bottom-nav-dan-modal.md`

### Berubah
- **React Portal & Z-Index Root Level**: Memindahkan mounting [Modal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/ui/Modal.tsx) langsung ke `document.body` menggunakan `createPortal` dengan `z-[999]`. Hal ini mengatasi isolasi *stacking context* dari elemen container `<main>` beranimasi sehingga seluruh modal/sheet dijamin selalu berada di lapisan teratas di atas bottom navigation bar.
- **Modal Safe Area & Dynamic Viewport**: Menambahkan safe-area bottom padding (`pb-[max(env(safe-area-inset-bottom),2.5rem)]`) dan dynamic viewport height (`max-h-[88dvh]`) pada [Modal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/ui/Modal.tsx) sehingga tombol aksi simpan (Simpan Pengeluaran, Pemasukan, Tagihan, Hutang, Aset, dll.) tampil utuh dan leluasa disentuh.
- **Perbaikan Z-Index Bottom Sheet "Lainnya"**: Menyesuaikan z-index More Bottom Sheet dan backdrop di [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx) menjadi `z-50` (sebelumnya `z-35` yang berada di bawah nav bar `z-40`, mengakibatkan tombol di baris bawah tertindih nav bar dan tidak bisa disentuh).
- **Padding Konten Utama Aman**: Memperbarui padding bawah kontainer utama di [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) menjadi `pb-[calc(6.5rem+env(safe-area-inset-bottom))]` agar seluruh daftar transaksi dan tombol terbawah halaman bebas dari tumpukan bottom nav bar.
- **Penataan Elemen Mengambang**: Memperbarui posisi floating toast di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) dan prompt pemasangan iOS di [IosInstallPrompt.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/IosInstallPrompt.tsx) menggunakan kalkulasi `bottom-[calc(5.5rem+env(safe-area-inset-bottom))]` agar tidak saling bertabrakan.

## [2026-08-25] Perbaikan Kehalusan Animasi Transisi Tema

**Plan**: `docs/plans/2026-08-25-tombol-switch-darkmode-dashboard-animasi.md` (revisi lanjutan)

### Berubah
- **Reveal Satu Arah Konsisten**: Menghapus selector ganda `.dark::view-transition-*` yang membuat arah dark→light memakai jalur animasi `reverse` berbeda dan terasa patah; kini light→dark maupun dark→light memakai satu animasi `circleReveal` identik.
- **Easing & Durasi Baru**: Kurva `cubic-bezier(0.22, 1, 0.36, 1)` (ease-out quint) durasi 500ms dengan `animation-fill-mode: both` agar gerakan mengembang terasa lebih natural.
- **Fallback Transisi Warna**: Menambahkan transisi `background-color`/`color` 350ms pada `body` untuk browser tanpa View Transitions API sehingga pergantian tema tetap lembut.

## [2026-08-25] Tombol Switch Dark Mode di Pojok Header & Animasi Transisi

**Plan**: `docs/plans/2026-08-25-tombol-switch-darkmode-dashboard-animasi.md`

### Berubah
- **ThemeToggle Component**: Membuat komponen [ThemeToggle.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/ui/ThemeToggle.tsx) dengan knob meluncur halus, ikon Sun/Moon yang berotasi dan crossfade, serta dukungan View Transitions API untuk efek sapuan lingkaran (*circular reveal*).
- **Penempatan Pojok Header**: Mengintegrasikan `ThemeToggle` pada [TopHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/TopHeader.tsx) di pojok kanan atas di samping menu profil, sehingga selalu dapat diakses di seluruh tab aplikasi.
- **Sinkronisasi Multi-Arah**: Menghubungkan state tema antara switch di header dan segmented control di [SettingsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx) melalui event kustom `theme-changed`.
- **CSS Keyframes & Animasi Global**: Menambahkan definisi keyframes `fadeIn`, `scaleIn`, `slideUp` dan aturan `@media (prefers-reduced-motion)` pada [globals.css](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/globals.css) untuk mengaktifkan animasi di modal, popover dropdown, dan notifikasi.

## [2026-08-25] Fitur Dark Mode & Tema Fleksibel (Terang / Gelap / Sistem)

**Plan**: `docs/plans/2026-08-25-fitur-dark-mode.md`

### Berubah
- **Anti-flash Script**: Menambahkan inline script evaluasi tema di `<head>` [layout.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/layout.tsx) untuk mencegah kedipan tema salah saat reload, serta menambahkan `suppressHydrationWarning` pada tag `<html>`.
- **Pengaturan Tema di UI**: Menyediakan segmented control 3 opsi (Terang / Gelap / Sistem) pada [SettingsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx) dengan persistensi `localStorage` dan ikon intuitif (Sun, Moon, Desktop).
- **Adaptasi Mode Sistem Real-time**: Menambahkan listener `matchMedia('(prefers-color-scheme: dark)')` saat mode sistem aktif sehingga tampilan otomatis menyesuaikan preferensi OS tanpa reload.
- **Linting & Stability**: Mengisolasi setState tema ke microtask agar mematuhi aturan react-hooks tanpa cascading render.

## [2026-08-25] Upgrade UX, Alur Transaksi, Edit Transaksi & Perbaikan Visual

**Plan**: `docs/plans/2026-08-25-upgrade-ux-dan-perbaikan-keseluruhan.md`

### Berubah
- **Fitur Edit Transaksi**: Menambahkan endpoint `PUT /api/transactions/[id]` dengan pembalikan saldo atomik, proteksi *strict-zero*, dan tombol aksi edit di `TransactionItem`.
- **Form Catat/Edit Transaksi**: Menata ulang alur urutan form secara logis (Kategori/Dompet → Nominal → Tanggal → Catatan), menyematkan pratinjau sisa saldo dompet, dan mengganti native alert offline dengan status banner.
- **Konfirmasi Hapus Aman**: Mengganti native `confirm()` dan penghapusan 1-klik tanpa konfirmasi pada `BillItem`, `DebtItem`, dan `WalletsView` dengan tombol inline konfirmasi `[Hapus] [Batal]`.
- **Pengaturan & Profil Pengguna**: Mengaktifkan pengeditan nama pengguna (`users.name`), mengganti raw `fetch` dengan `apiFetch`, dan menghapus seluruh browser `alert()` / `confirm()`.
- **Context-Aware Header**: Menyembunyikan pemilih periode tanggal pada tab yang non-period (Aset, Hutang, Pengaturan) agar tidak membingungkan pengguna.
- **Kepadatan Tampilan Hutang-Piutang (DebtsView)**: Mengubah 3 summary cards vertikal menjadi strip 3-kolom responsif untuk mengurangi jarak scroll di perangkat mobile.

### Hasil Audit Pasca-Eksekusi
- **Fix build**: [not-found.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/not-found.tsx) kini client component (`'use client'`) karena `@phosphor-icons/react` memanggil `createContext` saat evaluasi modul.
- **Fix lint**: setState sinkron di efek [TransactionList.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionList.tsx) dipindah ke microtask agar tidak memicu render berantai (`set-state-in-effect`).
- **Test E2E diperluas**: skenario [4d] kini mencakup PUT pemulihan nominal (uji pembaruan kedua + saldo kembali 4.347.500), menjaga konsistensi asersi anggaran [5].
- **Verifikasi penuh lulus**: build 0 error, lint bersih, audit self-test 70/70, E2E 35/35.

## [2026-08-25] Mobile UX Overhaul — Tampilan HP Simple & Premium

**Plan**: `docs/plans/2026-08-25-mobile-ux-overhaul-tampilan-hp-simple-premium.md`

### Berubah
- **BottomNav**: Redesain ke 5 tab — Beranda, Transaksi, [FAB Catat], Dompet, Lainnya. Tab "Lainnya" membuka bottom sheet dengan 7 modul + 3 quick action typed.
- **MonthlySummary**: Strip 1 baris compact di mobile; 3 kartu penuh di desktop.
- **QuickActions**: 6 module shortcuts disembunyikan di mobile (`hidden md:grid`).
- **BalanceHeader**: Safe-to-spend compact di mobile; navigation links disembunyikan di mobile.
- **Fix**: Circular import `NavTab` di BottomNav.tsx — kini didefinisikan lokal.

## [2026-08-24] Redesain Total Hierarki Visual & Layout Dashboard Beranda

**Plan**: `docs/plans/2026-08-24-redesain-hierarki-visual-dashboard-beranda.md`

### Berubah
- **Restrukturisasi Aksi Cepat (Quick Actions)**: Membagi menu aksi menjadi 2 kelompok proporsional tanpa ada item yang patah baris sendirian:
  1. *3 Tombol Utama Transaksi (Hero Action Buttons)*: Pengeluaran, Pemasukan, dan Transfer kas langsung.
  2. *6 Pintasan Modul Simetris*: Anggaran, Tagihan, Hutang, Aset, Laporan, dan Evaluasi.
- **Redesain Kartu Saldo & Likuiditas (Balance Header)**: Mengubah label menjadi "Total Saldo Kas & Likuiditas", memperbesar tipografi angka saldo (`text-2xl sm:text-3xl font-extrabold`), dan menyatukan sub-kartu *Safe-to-Spend* berdesain *glassmorphism* yang rapi.
- **Penyempurnaan Pos Kas & Ringkasan Arus Kas**: Mengharmonisasikan kartu dompet rekening dan ringkasan arus kas dengan kontras warna yang nyaman dan perataan angka tabular yang presisi.

## [2026-08-24] Audit Visual Komprehensif & Redesain Sidebar Modern Kelas Atas

**Plan**: `docs/plans/2026-08-24-audit-visual-dan-redesain-sidebar-modern.md`

### Berubah
- **Redesain Tipografi & Identitas Brand**: Memperbarui header logo dengan squircle modern bersinar lembut, font merek `KasPribadi` tajam berdensitas pas (`text-base font-extrabold tracking-tight`), dan subtitle nama kas yang proporsional.
- **Tombol Catat Transaksi Ramping**: Mengoptimalkan ukuran dan bayangan tombol utama (+ Catat Transaksi) dengan sudut melengkung modern dan popover dropdown dengan latar *backdrop-blur*.
- **Hierarki Seksi & Menu Elegan**: Merapikan jarak vertikal (*letter-spacing* `tracking-widest text-[9.5px] font-bold text-text-muted/60`), mengganti kapsul aktif pekat dengan *elevated soft pill* (`bg-primary/10 text-primary font-bold border border-primary/20`), dan transisi hover yang mulus.
- **Penyempurnaan Widget Bawah**: Memadatkan kartu mini pintasan keyboard 2-kolom yang simetris dan kartu profil pengguna ber-avatar inisial dengan tombol logout elegan.

## [2026-08-24] Peningkatan Visual UI/UX Modern & Modul Evaluasi Keuangan Lengkap

**Plan**: `docs/plans/2026-08-24-optimasi-visual-ui-ux-dan-modul-evaluasi-keuangan.md`

### Berubah
- **Perbaikan State & Estetika Visual Sidebar**:
  - Mengisolasi tab `evaluation` sebagai ID unik pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx) untuk mengatasi *bug double active state* pada menu Laporan & Evaluasi.
  - Memperbarui gaya indikator aktif dengan pill solid modern (`bg-primary text-white shadow-2xs font-bold`) dan transisi hover yang bersih, rapi, serta presisi.
- **Modul Baru Evaluasi Keuangan (`EvaluationView.tsx`)**:
  - **Skor Kesehatan Finansial (0 - 100)**: Kalkulasi kesehatan keuangan komprehensif berdasarkan surplus kas, rasio dana darurat, rasio tabungan, dan beban hutang.
  - **4 Rasio Finansial Esensial**:
    1. *Ketahanan Kas / Dana Darurat*: Estimasi durasi bulan hidup yang dapat ditopang kas saat ini.
    2. *Rasio Tabungan (Savings Rate %)*: Persentase surplus bersih dari total pendapatan bulanan.
    3. *Beban Hutang (Debt-to-Income / DTI %)*: Rasio sisa hutang terhadap kapasitas pendapatan.
    4. *Nilai Buku Portofolio Aset*: Nilai pasar dan akumulasi penyusutan seluruh barang berharga.
  - **Estimasi Kekayaan Bersih (Net Worth)**: Agregasi real-time dari Total Kas + Nilai Buku Aset + Piutang - Hutang.
  - **Analisis & Rekomendasi Taktis**: Kotak saran cerdas otomatis untuk memandu perbaikan rasio keuangan pengguna.
- **Penyambungan Navigasi**: Tab `evaluation` terhubung penuh di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx), [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), dan [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx).

## [2026-08-24] Sidebar Kompak Bertingkat dengan Section Head dan Sub-Menu

**Plan**: `docs/plans/2026-08-24-sidebar-kompak-bertingkat-head-submenu.md`

### Berubah
- **Struktur Menu Bertingkat (Section Heads & Sub-Menu)**: Merestrukturisasi navigasi sidebar desktop pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx) ke dalam 5 kelompok logis:
  1. **Utama**: Beranda & Riwayat Transaksi.
  2. **Kas & Anggaran**: Pos Kas & Rekening, Anggaran Bulanan, Tagihan Rutin.
  3. **Aset & Kewajiban**: Aset & Depresiasi, Hutang & Piutang.
  4. **Laporan & Evaluasi**: Laporan & Ekspor, Evaluasi Arus Kas.
  5. **Sistem**: Pengaturan & Backup.
- **Densitas Tinggi & Ramping**: Memadatkan padding container (`p-3.5`), ukuran tinggi tombol menu (`py-1.5 px-2.5` dengan font `text-xs` dan ikon `17px`), serta kotak pintasan keyboard dan avatar profil sehingga muat 15+ sub-menu tanpa scroll panjang.

## [2026-08-24] Rebranding KasPribadi & Fitur Manajemen Aset dan Depresiasi

**Plan**: `docs/plans/2026-08-24-fitur-kaspribadi-dan-manajemen-aset-depresiasi.md`

### Berubah
- **Rebranding KasPribadi**: Memperbarui nama aplikasi, logo, dan identitas visual menjadi **KasPribadi**.
- **Nama Kas Otomatis & Fleksibel**: Saat registrasi user baru di [register/route.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/api/auth/register/route.ts), nama kas otomatis diset sesuai nama pengguna (misal: "Kas <Nama>") dan dapat diubah sewaktu-waktu melalui form Edit Profil & Nama Kas di Pengaturan.
- **Tabel & Migrasi Database Aset**: Membuat tabel `assets` di Neon Postgres dengan kolom umur ekonomis, metode penyusutan (*Straight-Line*, *Declining Balance*, *None*), nilai perolehan, nilai residu, dan catatan.
- **Modul Backend `/api/assets` & `/api/assets/[id]`**: Menyediakan API CRUD lengkap dengan kalkulasi otomatis usia aset, estimasi nilai buku berjalan (*net book value*), akumulasi depresiasi, serta beban penyusutan bulanan/tahunan.
- **Komponen Antarmuka Manajemen Aset**:
  - [AssetsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/assets/AssetsView.tsx): 4 kartu ringkasan metrik (Total Perolehan, Nilai Buku Sekarang, Akumulasi Susut, Beban Susut/Bulan), tab filter kategori, search bar, list kartu aset berprogres penyusutan.
  - [AssetModal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/assets/AssetModal.tsx): Modal formulir catat/ubah aset dengan simulator perhitungan nilai buku instan.
- **Integrasi Navigasi**: Menambahkan tab menu **Aset & Depresiasi** pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx), dan [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx).
- **Pengujian Lengkap**: Menambahkan pengujian skema & formula depresiasi di `scripts/audit-self-test.ts` (70/70 passed) dan pengujian integrasi E2E CRUD aset di `scripts/e2e-full-suite.ts` (28/28 passed).

## [2026-08-24] Fitur Dropdown Menu Catat Transaksi di Sidebar

**Plan**: `docs/plans/2026-08-24-fitur-dropdown-catat-transaksi-sidebar.md`

### Berubah
- **Menu Dropdown Tombol Catat Transaksi**: Memperbarui [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx) dengan menambahkan popover dropdown interaktif pada tombol "+ Catat Transaksi". Menampilkan pilihan instan jenis transaksi: Pengeluaran (E), Pemasukan (I), dan Transfer Dompet (T).
- **Deteksi Klik Luar & Keyboard Escape**: Dilengkapi dengan event listener outside click dan tombol Escape agar menu tertutup mulus ketika user mengeklik bagian lain layar.
- **Penyambungan Prop Handler**: Meneruskan prop `onOpenTypedModal` dari [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) ke [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx).

## [2026-08-24] Desain Kompak Mobile & Efisiensi Layar Minimal Scroll

**Plan**: `docs/plans/2026-08-24-desain-kompak-mobile-minimal-scroll.md`

### Berubah
- **Laporan & Arus Kas Kompak**: Memadatkan ringkasan likuiditas di [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx) menjadi grid 2x2 kompak (`grid-cols-2 lg:grid-cols-4 gap-2`) dengan padding `p-2 sm:p-2.5` sehingga seluruh metrik utama muat dalam satu kotak ringkas tanpa scroll panjang.
- **Header Saldo & Safe-to-Spend Padat**: Mengoptimalkan ukuran [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx) (`p-3.5 sm:p-5`, font saldo `text-xl sm:text-2xl md:text-3xl`, strip safe-to-spend `p-2.5 sm:p-3`).
- **Aksi Cepat & Pos Kas Ringkas**: Merampingkan [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx), dan [WalletScroller.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/WalletScroller.tsx) agar menghemat lebih dari 40% tinggi vertikal di layar smartphone.
- **Pembersihan Whitespace Kontainer**: Menyesuaikan padding utama pada [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx) (`p-2.5 sm:p-4`) dan jarak seksi [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) (`space-y-3.5 sm:space-y-5`).

## [2026-08-24] Optimasi Visual Mobile & Tipografi Anti-Wrapping Angka Rupiah

**Plan**: `docs/plans/2026-08-24-optimasi-visual-mobile-anti-wrapping.md`

### Berubah
- **Pencegahan Teks Rupiah Terpisah (Anti-Wrapping)**: Memperbarui [formatters.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/formatters.ts) dengan menyisipkan spasi tak terputus (*non-breaking space* `\u00A0`), mengunci simbol "Rp" dan digit angka agar tidak terpisah atau turun baris sendirian di browser ponsel manapun.
- **Restrukturisasi Kartu Laporan & Arus Kas**: Memperbarui [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx) dengan struktur layout responsif (`grid-cols-1 sm:grid-cols-2 lg:grid-cols-4` dan `grid-cols-1 sm:grid-cols-2`) serta `whitespace-nowrap tabular-nums` untuk melenyapkan tampilan teks berhimpitan dan tumpang tindih.
- **Standarisasi Tipografi Angka**: Menerapkan kelas `whitespace-nowrap tabular-nums` secara konsisten pada [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx), [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx), [DebtItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtItem.tsx), [DebtsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtsView.tsx), [BillItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/bills/BillItem.tsx), [BudgetProgressBar.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/budget/BudgetProgressBar.tsx), dan [TransactionItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionItem.tsx).

## [2026-08-24] Perbaikan Kolom Idempotency Key & Error Mapping Pencatatan Transaksi

**Plan**: `docs/plans/2026-08-24-perbaikan-idempotency-key-dan-pencatatan-transaksi.md`

### Berubah
- **Migrasi Kolom Idempotency Key**: Mengeksekusi penambahan kolom `idempotency_key` (UUID) dan unique partial index `idx_trx_idempotency` pada tabel `transactions` di live database Neon Postgres.
- **Pemetaan Error Database Ramah Pengguna**: Memperbarui [apiHelpers.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/apiHelpers.ts) dengan pemetaan kode error PostgreSQL (`23514`, `23505`, `23503`, `22P02`) menjadi pesan error bisnis yang jelas (contoh: notifikasi saldo dompet tidak mencukupi alih-alih pesan server generik).
- **Verifikasi Transaksi Riil**: Memvalidasi alur simpan transaksi pengeluaran, pemasukan, dan transfer langsung terhadap database live (100% PASS).

## [2026-08-24] Pengujian End-to-End (E2E) Menyeluruh Semua Fungsi

**Plan**: `docs/plans/2026-08-24-e2e-pengujian-menyeluruh-semua-fungsi.md`

### Berubah
- **Suite Pengujian E2E Otomatis**: Membuat skrip pengujian komprehensif [e2e-full-suite.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/scripts/e2e-full-suite.ts) yang menguji langsung terhadap database live Neon Postgres mencakup 13 modul fungsional:
  1. Registrasi user baru & auto-seeding dompet default (4 dompet), kategori (15 kategori), dan profil pengaturan keluarga.
  2. Autentikasi Bcrypt & penandatanganan/verifikasi token sesi JWT (`jose`).
  3. Manajemen dompet, mutasi saldo, dan penegakan batas strict-zero (saldo anti-minus).
  4. Transaksi multi-tipe (pengeluaran, pemasukan, dan transfer antar-dompet dengan biaya admin & locking deterministik).
  5. Pembuatan batas anggaran bulanan per kategori dan kalkulasi pelacakan real-time.
  6. Pendaftaran tagihan rutin dan pelunasan tagihan atomik multi-tabel (`bill_payments`, `transactions`, `wallets`).
  7. Modul hutang-piutang: pencatatan pinjaman, pembayaran cicilan, dan pembaruan saldo dompet.
  8. Agregasi bootstrap dashboard dan kalkulasi arus kas likuiditas nyata (*Safe-to-Spend*).
  9. Ekspor cadangan JSON, ekspor laporan transaksi CSV, dan isolasi data per-user.
  10. Pembaruan pengaturan nama keluarga dan mata uang.
  11. Pembersihan data pengujian (*cascade teardown*).
- **Integrasi Test Command**: Mengintegrasikan script `test:e2e` ke dalam `npm test` (`test:audit` + `test:e2e`), mencakup total **87 assertions** (62 unit test + 25 E2E test) dengan tingkat kelulusan 100%.

## [2026-08-24] Menu Profil, Pengaturan & Edit Akun di Top Header Mobile

**Plan**: `docs/plans/2026-08-24-menu-profile-pengaturan-mobile.md`

### Berubah
- **Menu Dropdown Profil Header**: Menambahkan dropdown popover interaktif pada tombol avatar profil di [TopHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/TopHeader.tsx) yang mudah diakses di smartphone dan desktop.
- **Navigasi Lengkap Profil**: Menyediakan badge identitas (nama pengguna, email, nama keluarga), tombol akses langsung ke "Pengaturan & Backup", tombol "Edit Profil & Keluarga", serta tombol "Keluar dari Akun" (logout).
- **Penutupan Responsif**: Menambahkan deteksi klik di luar (outside click) dan tombol Escape untuk menutup menu secara mulus.

## [2026-08-24] Perbaikan Parsing Sesi Auth & Redirect Login

**Plan**: `docs/plans/2026-08-24-perbaikan-auth-session-login-redirect.md`

### Berubah
- **Perbaikan Ekstraksi Sesi Auth**: Menyelaraskan bentuk respons objek user pada [route.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/api/auth/me/route.ts) dan ekstraksi `userObj` di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) (`data.data?.user || data.data`), mengatasi kendala pengguna kembali terlempar ke halaman login sesaat setelah berhasil masuk.
- **Transisi Navigasi Auth**: Memastikan [LoginPage](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/(auth)/login/page.tsx) dan [RegisterPage](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/(auth)/register/page.tsx) memicu `router.push('/')` dan `router.refresh()` secara sinkron dengan cookie httpOnly.
- **Unit Test Coverage**: Menambahkan 5 assertion baru di [audit-self-test.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/scripts/audit-self-test.ts) untuk memvalidasi JWT token roundtrip dan kompatibilitas parsing sesi (total 62 passed).

## [2026-08-24] Fitur Hutang-Piutang, Navigasi Back Mobile, dan Laporan Cashflow Komprehensif

**Plan**: `docs/plans/2026-08-24-fitur-hutang-piutang-navigasi-back-laporan-cashflow.md`

### Berubah
- **Modul Hutang & Piutang**: Membuat tabel `debts` dan `debt_payments` di database, endpoint CRUD `GET/POST/PUT/DELETE /api/debts`, serta endpoint transaksi cicilan/pelunasan `POST /api/debts/[id]/pay` yang terhubung atomik dengan mutasi saldo dompet kas dan pencatatan riwayat transaksi.
- **Komponen UI Hutang & Piutang**: Membuat [DebtsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtsView.tsx) dan [DebtItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/debts/DebtItem.tsx) dengan kartu visual, progress bar pelunasan bertahap, status badge jatuh tempo/menunggak, dan modal pembayaran cicilan dengan tombol quick full-payment.
- **Kalkulasi Likuiditas Nyata (Safe-to-Spend)**: Menghitung metrik *Dana Bebas Belanja* (Safe-to-Spend) secara riil: $\text{Total Kas} - (\text{Tagihan Pending} + \text{Hutang Jatuh Tempo}) + \text{Piutang Masuk}$. Ditampilkan di widget [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx) dan breakdown komprehensif di [ReportsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/ReportsView.tsx).
- **Navigasi Back Mobile & Proteksi Keluar**: Membangun history stack dan event handler `popstate` di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx). Menekan tombol back akan menutup modal aktif atau kembali ke tab sebelumnya. Jika sudah berada di beranda (root), aplikasi menampilkan toast konfirmasi *"Tekan sekali lagi untuk keluar dari aplikasi"* untuk mencegah ketidaksengajaan keluar.
- **Navigasi & Akses Cepat**: Menambahkan tab Hutang-Piutang di [BottomNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/BottomNav.tsx), [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx), dan tombol aksi di [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx).
- **Test Suite**: Memperluas unit test di [audit-self-test.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/scripts/audit-self-test.ts) menjadi 57 passed assertions.

## [2026-08-24] Optimasi Visual Menyeluruh Mobile-First

**Plan**: `docs/plans/2026-08-24-optimasi-visual-mobile-first.md`

### Berubah
- **Pembersihan Teks Terpotong**: Menghilangkan pemotongan teks paksa (`truncate`) di [QuickActions.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/QuickActions.tsx), menyesuaikan padding grid dan typography (`break-words text-center leading-tight`) agar label "Pengeluaran", "Pemasukan", "Transfer", "Hutang", "Anggaran", dan "Tagihan" terbaca utuh di semua resolusi handphone (320px–430px+).
- **Responsivitas Komponen Inti**: Menyesuaikan padding kartu, ukuran touch target (min 40–44px), dan tipografi responsif pada [BalanceHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/BalanceHeader.tsx), [MonthlySummary.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/dashboard/MonthlySummary.tsx), [BudgetProgressBar.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/budget/BudgetProgressBar.tsx), [BillItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/bills/BillItem.tsx), [TransactionItem.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionItem.tsx), [TopHeader.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/TopHeader.tsx), dan [AppShell.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/AppShell.tsx).

## [2026-08-24] Kesiapan Produksi & Verifikasi Menyeluruh KasKeluarga

**Plan**: `docs/plans/2026-08-24-kesiapan-produksi-dan-verifikasi-e2e.md`

### Berubah
- **Verifikasi Alur End-to-End**: Memverifikasi alur registrasi user, auto-seeding dompet & kategori, isolasi data multi-user, transaksi multi-pos, transfer kas aman deadlock, anggaran bulanan, pembayaran tagihan rutin, serta ekspor CSV dan backup/restore JSON.
- **Verifikasi PWA & Offline Engine**: Memvalidasi ketahanan offline, antrean mutasi IndexedDB, dan sinkronisasi otomatis `drainOfflineQueue` dengan proteksi double-debit berbasis `Idempotency-Key`.
- **Automated Validation Triad**:
  - `npm test`: 51 assertions passed 100%.
  - `npm run lint`: 0 errors dan 0 warnings pada ESLint 9 flat config.
  - `npm run build`: 22 static & dynamic routes terkompilasi optimal (turbopack compile time < 600ms).

## [2026-08-24] Optimasi Performa Ekstrem dan Pembersihan Kualitas Kode

**Plan**: `docs/plans/2026-08-24-optimasi-performa-dan-kualitas-kode.md`

### Berubah
- **Optimasi React & State Flow**: Merefaktor state initialization di [TransactionModal.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionModal.tsx) dengan pola `TransactionForm` terisolasi dan sinkronisasi event handler, meniadakan cascading render dan warning React 19.
- **Pembersihan Lint & Kode Bersih**: Menghilangkan seluruh warning unused imports dan mengetatkan tipe data pada chart tooltips ([CashflowChart.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/CashflowChart.tsx), [CategoryChart.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/reports/CategoryChart.tsx)), [SettingsView.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx), [TransactionList.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionList.tsx), [auth.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/auth.ts), dan [db.ts](file:///f:/APLIKASI-KEUANGAN-GANANG/src/lib/db.ts). Linter kini lulus dengan **0 error dan 0 warning**.
- **External Store Sync**: Menerapkan `useSyncExternalStore` di [IosInstallPrompt.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/IosInstallPrompt.tsx) dan [OfflineBanner.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/OfflineBanner.tsx) untuk pemantauan konektivitas dan browser storage yang bebas efek samping.
- **Dynamic Code-Splitting & Bundel Minimal**: Mengubah pemuatan view sekunder ([BudgetView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/budget/BudgetView.tsx), [BillsView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/bills/BillsView.tsx), [WalletsView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/wallets/WalletsView.tsx), [SettingsView](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/settings/SettingsView.tsx), [TransactionModal](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/transactions/TransactionModal.tsx)) di [page.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/app/page.tsx) menjadi `next/dynamic` dengan skeleton placeholder, mempercepat First Contentful Paint dan TTI dashboard.
- **Optimasi Produksi Next.js**: Mengaktifkan `compiler.removeConsole` pada mode produksi di [next.config.mjs](file:///f:/APLIKASI-KEUANGAN-GANANG/next.config.mjs).

## [2026-08-24] Audit Menyeluruh dan Perbaikan Keamanan, Integritas, serta Kualitas KasKeluarga

**Plan**: `docs/plans/2026-08-24-audit-dan-perbaikan.md`

### Berubah
- **Keamanan Kritis**: Menghapus file secret plaintext dari root workspace, memperbarui aturan `.gitignore` (`env-*.json`, `.env*`, `proj-old.json`, `dep.json`), memindahkan kredensial ke `.env.local`. Mengamankan `/api/init` dengan secret header/first-bootstrap guard & transaksi atomik. Memperketat `/api/backup/import` dengan skema Zod lengkap dan isolasi data per-user (`user_id` paksa dari session). Menambahkan filter `user_id` di semua operasi pembaruan dompet pada `DELETE /api/transactions/[id]`, `POST /api/transactions`, dan `POST /api/bills/[id]/pay`.
- **Integritas Data & Transaksi**: Menambahkan constraint database `balance >= 0` pada tabel `wallets`. Menambahkan kunci idempotency (`Idempotency-Key`) untuk transaksi offline queue serta pencegahan race condition/double-debit pada drain queue. Mengurutkan penguncian wallet secara deterministik (berdasarkan UUID) pada operasi transfer. Membungkus mutasi multi-tabel dalam `withTransaction` atomik.
- **Error Handling & Validasi**: Membuat helper `src/lib/apiHelpers.ts` (`handleRouteError` & `readJsonBody`) untuk menyaring pesan error internal di semua 22 route handler API agar pesan server mentah tidak bocor ke client.
- **State UI & Aksesibilitas**: Menyediakan error state dan retry button global pada dashboard bootstrap, loading skeleton dan error banner di `ReportsView`, empty state dan konfirmasi hapus di `WalletsView` serta `BillsView`. Menghapus pembatasan zoom di viewport, menambahkan label aksesibel (`htmlFor` & `aria-label`) serta dialog focus trap.
- **Kualitas Kode, PWA & Performa**: Menyediakan `apiFetch` tersentralisasi, migrasi `eslint.config.mjs` ke native flat config ESLint 9 + Next.js 16, registrasi Service Worker PWA di `src/app/layout.tsx` dengan strategi network-first navigasi dan cache-first aset statis, serta memparalelkan kueri bootstrap dan laporan.
- **Test Suite**: Memperluas `scripts/audit-self-test.ts` untuk menguji 51 assertions mencakup seluruh skema validasi Zod dan formatter rupiah/tanggal produksi.

### Dampak
- Database PostgreSQL membutuhkan eksekusi inisialisasi `/api/init` untuk menerapkan constraint `wallets_balance_nonnegative` dan kolom `idempotency_key`.
- Secret lama yang sempat berada di file plaintext lokal tidak boleh digunakan lagi di lingkungan publik.
