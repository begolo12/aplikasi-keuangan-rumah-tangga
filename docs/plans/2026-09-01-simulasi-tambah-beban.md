# Plan: Simulasi What-If Dua Arah (Hemat & Tambah Beban) + Proyeksi 12 Bulan

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Simulasi saat ini hanya bisa mencoba skenario penghematan. User juga ingin tahu: "kalau saya NAMBAH (beli motor, aset, langganan baru), apakah kondisi keuangan masih baik?" — dan melihat dampak **jangka panjang sampai 1 tahun ke depan** bulan-per-bulan, bukan cuma snapshot.

## Keputusan Desain
- Simulator jadi dua kelompok skenario: **Hemat** (matikan tagihan, kurangi kategori — sudah ada) dan **Tambah Beban** (baru):
  1. Langganan/biaya bulanan baru → dampak arus kas bulanan.
  2. Beli tunai (aset/barang) → dampak kas sekali bayar.
  3. Cicilan (DP + angsuran × tenor) → dampak gabungan: kas berkurang DP, beban bulanan naik.
- Vonis kondisi keuangan setelah semua skenario:
  - **Berisiko**: kas tidak cukup untuk pembelian, atau arus kas bulanan jadi minus.
  - **Waspada**: sisa kas di bawah cadangan wajib 4.4x anggaran (bila anggaran tersedia).
  - **Aman**: selain itu.
- Output ringkas: arus kas bulanan sebelum → sesudah, kas sebelum → sesudah pembelian, badge vonis + alasan, dan dampak 6/12 bulan (net bulanan × n).
- **Proyeksi 12 bulan (baru, jangka panjang)**:
  - Hitung kumulatif: `kasAwal = totalCash - oneTimeCost`, tiap bulan `kas += cashflowAfter` (asumsi pemasukan/pengeluaran bulan berjalan konstan + skenario).
  - Tampilkan tabel 12 baris (Bulan ke-1..12 + label kalender MMM YYYY) dengan kolom Kas Proyeksi vs baseline Tanpa Skenario, gap, dan status vs cadangan 4.4x.
  - Garis/chart mini tren kas (baseline vs dengan skenario) + garis cadangan wajib sebagai referensi. Sorot bulan pertama ketika kas di bawah cadangan atau minus.
  - Tetap murni kalkulasi klien; tidak ada endpoint/DB baru. Respect tenor cicilan: angsuran hanya selama tenor, setelah lewat beban bulanan kembali turun (hemat paling lazy: tenor diabaikan dulu, angsuran dianggap permanen — ditandai `ponytail:` bila disederhanakan).

## Ruang Lingkup
- [x] Perluas `ScenarioSimulator` dengan mode Tambah Beban (3 jenis) + section vonis.
- [x] Props baru: `monthlyExpense`, `totalCash`, `safetyReserve` (dihitung EvaluationView dari budgets).
- [x] Evaluasi: kirim data ke simulator.
- [ ] Tambah proyeksi 12 bulan: tabel + chart mini + sorotan bulan kritis.

## File yang Disentuh
- `src/components/evaluation/ScenarioSimulator.tsx`
- `src/components/evaluation/EvaluationView.tsx`

## Kriteria Selesai
1. Menambah skenario langganan/cicilan/beli tunai menampilkan dampak & vonis yang benar.
2. Tabel/chart 12 bulan tampil saat ada skenario; kas kumulatif = kasAwal + n*cashflowAfter; bandingkan dengan baseline dan garis cadangan 4.4x.
3. `npm run lint`, `npm run build`, `npm test` lulus.
