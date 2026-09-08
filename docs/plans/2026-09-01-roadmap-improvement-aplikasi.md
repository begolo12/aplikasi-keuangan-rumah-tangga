# Plan: Roadmap Peningkatan Aplikasi KasKeluarga — Prioritas Bertahap

- Tanggal: 2026-09-01
- Status: done

## Tujuan
Menyusun roadmap peningkatan fitur berbasis kondisi aplikasi saat ini (fitur lengkap, codebase stabil, build & test lulus). Setiap fase dirancang agar dapat dieksekusi terpisah tanpa merusak fitur yang sudah jalan. Prioritas ditentukan berdasarkan dampak ke user rumah tangga vs kompleksitas implementasi.

## Ruang Lingkup

### Fase 1 — Kas Rumah Tangga Bersama (Shared Household) [Prioritas Tertinggi]
Fitur paling fundamental yang belum ada. Menjadikan aplikasi benar-benar "Kas **Keluarga**" — bukan hanya pencatatan personal.

- [ ] Tabel `households` dan `household_members` di database.
- [ ] Sistem undangan member via kode/email (owner mengundang, member menerima).
- [ ] Dompet "bersama" yang dapat diakses semua member; dompet "pribadi" hanya owner.
- [ ] Atribusi transaksi: setiap expense/income dicatat siapa yang mencatat (`member_id`).
- [ ] Laporan per-member: siapa belanja paling banyak per kategori.
- [ ] Badge notifikasi saat member lain mencatat transaksi di dompet bersama.
- [ ] API isolation: owner melihat semua data household; member melihat dompet bersama + pribadinya sendiri.

### Fase 2 — Laporan Tahunan & Tren [Nilai Tinggi, Implementasi Ringan]
Melengkapi laporan bulanan yang sudah ada dengan perspektif tahunan.

- [ ] Grafik garis 12 bulan (pengeluaran vs pemasukan per bulan).
- [ ] Perbandingan YoY per kategori (tahun ini vs tahun lalu, delta %).
- [ ] Top 5 kategori pengeluaran tahunan.
- [ ] Ringkasan tabungan bersih per tahun (income − expense).
- [ ] Tambahkan selector "Tahunan" di `ReportsView` yang sudah ada.

### Fase 3 — Insight Pintar Otomatis [Diferensiator]
Bukan sekadar alert overbudget — deteksi pola dan saran yang bisa diambil tindakan.

- [ ] Deteksi lonjakan pengeluaran (kategori X naik >30% vs rata-rata 3 bulan).
- [ ] Deteksi dompet yang berulang kali minus (overdraft pattern).
- [ ] Saran "bayar tagihan Y lebih awal pakai saldo dompet Z" saat saldo cukup.
- [ ] Skor kesehatan keuangan sederhana (0–100) berdasarkan rasio savings, debt ratio, dan budget compliance.
- [ ] Widget "Insight Hari Ini" di dashboard dengan 2–3 insight teratas.

### Fase 4 — AI Receipt Learning [Peningkatan Fitur Existing]
Struk AI sudah ada. Tingkatkan agar makin akurat seiring penggunaan.

- [ ] Tabel `merchant_category_map` per user (merchant_name → category_id).
- [ ] Saat AI parse struk, cek mapping dulu → jika match, auto-set kategori tanpa konfirmasi.
- [ ] Saat user override kategori manual, simpan ke mapping.
- [ ] Confidence score per merchant (berapa kali mapping benar vs di-override).

### Fase 5 — Dompet Envelope (Tujuan Tertaut) [Polish]
Hubungkan dompet fisik dengan savings goal secara langsung.

- [ ] Tipe dompet baru: `envelope` dengan field `linked_goal_id`.
- [ ] Kontribusi ke goal otomatis mencatat transfer ke dompet envelope.
- [ ] Progress bar goal diambil dari saldo dompet envelope (bukan dari kontribusi terpisah).
- [ ] Opsional: warning jika saldo envelope minus dari target kontribusi.

### Fase 6 — Simulasi Skenario ("What-If") [Nice-to-Have]
Manfaatkan data kategori + tagihan rutin yang sudah ada.

- [ ] Input skenario: matikan langganan X, kurangi kategori Y sebesar RpN.
- [ ] Hitung proyeksi tabungan 6–12 bulan berdasarkan perubahan.
- [ ] Tampilkan hasil sebagai "RpN hemat per bulan → RpM per tahun".

### Fase 7 — PWA Push Notification Proaktif [Opsional, Terpisah]

- [ ] Reminder tagihan H-1 via service worker push notification.
- [ ] Reminder budget mendekati limit (75%+).

## File yang Disentuh (per fase)

**Fase 1 (Shared Household):**
- `src/app/api/households/` (baru)
- `src/app/api/households/[id]/members/` (baru)
- `src/app/api/init/route.ts` (tambah tabel households)
- `src/components/household/` (baru: HouseholdView, InviteModal)
- `src/components/transactions/TransactionModal.tsx` (tambah member attribution)
- `src/components/reports/ReportsView.tsx` (laporan per-member)
- `scripts/audit-self-test.ts`

**Fase 2 (Laporan Tahunan):**
- `src/app/api/reports/yearly/route.ts` (baru)
- `src/components/reports/ReportsView.tsx`
- `src/components/reports/YearlyReport.tsx` (baru)

**Fase 3 (Insight):**
- `src/app/api/insights/route.ts` (baru)
- `src/components/dashboard/InsightWidget.tsx` (baru)
- `src/app/page.tsx` (pasang widget di dashboard)

**Fase 4 (AI Learning):**
- `src/app/api/init/route.ts` (tambah tabel merchant_category_map)
- `src/app/api/ai/parse-receipt/route.ts` (cek mapping sebelum AI)
- `src/components/transactions/TransactionModal.tsx` (simpan mapping saat override)

## Kriteria Selesai (Definition of Done — per fase)
1. Fitur berjalan end-to-end tanpa error di dev server.
2. `npm run lint` dan `npm run build` lulus 0 error.
3. `npm test` lulus tanpa regresi.
4. Data isolation multi-user tetap terjaga (query DB selalu filter by user/household id).
5. Input divalidasi dengan Zod.

## Catatan Prioritas
- **Mulai dari Fase 1 atau 2.** Fase 1 paling berdampak tapi paling kompleks (multi-user, permission). Fase 2 paling murah (query SQL saja + satu view baru) dan memberi nilai langsung.
- Fase 3–7 dapat dieksekusi setelah Fase 1–2 stabil.
- Setiap fase akan dibuat plan doc terpisah saat mulai dieksekusi.
