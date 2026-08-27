# Plan: Kartu Putusan Akhir Bulan (Evaluasi)

- Tanggal: 2026-08-27
- Status: done
- Prinsip: rule-based deterministik dari angka yang sudah dihitung app. Tanpa narasi bebas,
  tanpa kata promosi; tiga baris menjawab tiga pertanyaan.

## Tujuan
Satu kartu di halaman Evaluasi yang membaca hasil bulan seperti penasihat rumah tangga tegas:
 surplus atau defisit, pos belanja mana yang renteng melampaui anggaran, dan apakah dana longgar
(uang dingin) aman dipakai.

## Struktur Putusan (3 baris, template tetap)
1. Arus kas: "Bulan ini kas [naik/turun] Rp X." (data net_cash_flow periode aktif)
2. Pos renteng: kategori pengeluaran terbesar yang melampaui anggarannya, format
   "'{kategori}' lewat batas {pct}% ({selisih}Rp)." Kalau tidak ada: "Semua pos dalam batas."
3. Uang dingin: "Dana longgar [tersedia: Rp N / belum siap: kurang Rp M]."
   Plus 1 baris tindakan tunggal terbesar (kategori overbudget nomor satu ATAU target naikkan tabungan) - maksimal satu saran.

## Ruang Lingkup
- [x] Komponen `DecisionCard` baru (src/components/evaluation/DecisionCard.tsx), style kartu utama Evaluasi, angka besar memakai font display serif (sesuai DESIGN.md bila plan visual sudah dieksekusi, fallback bold sans).
- [x] Ambil data dari endpoint laporan/budget yang sudah ada; jika payload kurang, tambah field agregat MINIMAL di `/api/reports/monthly` (tanpa query duplikat besar).
- [x] Semua kondisi empty/zero rapi (bulan tanpa transaksi: kartu menyatakan "belum ada data bulan ini").
- [x] Tes audit: fungsi pembentuk kalimat dipisah sebagai pure function + unit test skenario surplus-defisit-over-under-budget-dingin-tidak-tersedia.

## File yang Disentuh
- src/components/evaluation/EvaluationView.tsx, evaluation/DecisionCard.tsx (baru)
- src/app/api/reports/monthly/route.ts (hanya bila butuh field)
- src/lib/format/sentence builder (mis. src/lib/decisionSummary.ts, pure & testable)
- scripts/audit-self-test.ts
- changelog.md

## Kriteria Selesai (Definition of Done)
1. Kartu menunjukkan tiga baris putusan benar sesuai data riil pada semua skenario (surplus/defisit/over/no-over/dingin ya-tidak/bulan kosong).
2. Angka di kartu konsisten dengan Laporan & Dashboard (satu sumber agregasi, tidak ada divergensi definisi).
3. Tinggi kartu wajar mobile, tidak menambah scroll layer baru di Evaluasi.
4. Unit test pembentuk putusan lulus; build 100%.
