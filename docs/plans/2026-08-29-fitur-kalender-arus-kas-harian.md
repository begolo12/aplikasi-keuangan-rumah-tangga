# Plan: Fitur Kalender Arus Kas Harian

- Tanggal: 2026-08-29
- Status: done

## Tujuan
Menambahkan menu **Kalender** yang menampilkan kalender bulanan dimana setiap tanggal menunjukkan hasil bersih harian (**pemasukan − pengeluaran**). Pengguna dapat melihat sepintas hari mana yang surplus (+) atau defisit (−) dan mengetuk tanggal untuk melihat rincian transaksi hari tersebut.

## Ruang Lingkup
- [ ] Tambah `NavTab = 'calendar'` dan entri navigasi di `SidebarNav` (section Kas & Anggaran) dan `BottomNav` (sheet Lainnya) dengan ikon `CalendarBlank`
- [ ] Tambah `TopHeader` label untuk tab calendar (period selector sudah otomatis muncul karena tab tidak masuk daftar non-period)
- [ ] Buat komponen `src/components/calendar/CalendarView.tsx`: grid 7 kolom, header hari (Sen–Min, Senin sebagai awal minggu), sel tanggal dengan angka + net harian (compact), warna: hijau `income` bila net > 0, merah `expense` bila net < 0, netral bila 0/tidak ada transaksi; highlight hari ini & hari terpilih; navigasi bulan/tahun via `onPeriodChange`; ringkasan bulanan (total pemasukan, pengeluaran, net)
- [ ] Interaksi: klik tanggal → tampilkan daftar transaksi hari itu (filter dari `transactions` bootstrap) memakai `TransactionItem` style existing atau list ringkas; jika tidak ada transaksi → empty state ajak catat
- [ ] Integrasi di `src/app/page.tsx`: dynamic import `CalendarView`, render saat `activeTab === 'calendar'`, teruskan `transactions`, `currentMonth`, `currentYear`, `onPeriodChange`, handler edit/hapus transaksi (reuse `handleEditTransaction`/`handleDeleteTransaction`)
- [ ] Agregasi harian client-side dari `transactions` (filter `type income/expense`, `amount + admin_fee` untuk expense) — tanpa endpoint baru (ponytail: reuse bootstrap data)
- [ ] Penanganan tepi: bulan kosong → semua sel net 0; tanggal di luar bulan → disabled; tanggal masa depan tetap tampil net 0

## File yang Disentuh
- `src/components/layout/BottomNav.tsx` — type NavTab + MORE_MODULES
- `src/components/layout/SidebarNav.tsx` — NAV_SECTIONS
- `src/components/layout/TopHeader.tsx` — label badge untuk calendar (opsional, fallback period selector)
- `src/components/calendar/CalendarView.tsx` — baru
- `src/app/page.tsx` — import, state tab, render switcher

## Kriteria Selesai (Definition of Done)
- `npm run build` lulus, `npm run lint` 0 error baru
- Menu Kalender muncul di sidebar (desktop) dan sheet Lainnya (mobile), navigasi tab berfungsi dan period selector sinkron dengan kalender
- Setiap sel tanggal menampilkan net harian yang benar (pemasukan − pengeluaran termasuk admin_fee), warna sesuai tanda, dan klik tanggal membuka daftar transaksi hari itu
- Bulan tanpa transaksi tampil bersih tanpa error; hari ini ter-highlight
- Tidak menambah dependency baru; reuse `formatCompactRupiah`, `INDONESIAN_MONTHS`, `Transaction` types
