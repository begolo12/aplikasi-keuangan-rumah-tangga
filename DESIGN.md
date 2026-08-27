# DESIGN.md - Arah Desain KasKeluarga

Edisi: "Klasik Rumah" - ditetapkan 2026-08-27 dari keputusan pemilik produk.
Semua pekerjaan UI wajib mengikuti arah ini (filter antislop berlaku di atasnya).

## Persona & Narasi

KasKeluarga terasa seperti **dompet keluarga yang rapi**: hangat, tenang, bisa dipercaya,
seperti buku kas batiik dalam rumah yang bersih. Bukan aplikasi bank korporat, bukan dashboard trader.

## Dial (wajib dipegang)

| Dial | Nilai | Alasan |
|---|---|---|
| ENERGY | 1 | App pencatatan rutin harian; pengguna harus cepat masuk-catat-keluar |
| RHYTHM | 2 | Grid konsisten, dengan beberapa penekanan: kartu saldo boleh beda komposisi dari list |
| MOTION | 1 | Hover/state transition saja; animasi khusus: reveal halus modal & view transition tema |

## Palette

Netral hangat tidak dihitung sebagai warna core.

Core (maksimal 3):
1. **Emerald tua** - primary: kepercayaan finansial, identitas utama tombol & aksen aktif
2. **Terracotta merah bata** - semantic pengeluaran/peringatan: hangat, tidak agresif
3. **Hijau lumut** - semantic pemasukan: sejajar keluarga dengan primary tapi tetap terbedakan

Transfer & info memakai versi redup biru abu-laut sebagai SEMANTIK, bukan warna dekoratif.

Background & surface: **ivory/porselen** (kehangatan kertas dompet, bukan putih steril).
Dark mode tetap wajib lengkap (toggle existing dipertahankan, kedua mode divalidasi).

## Typography

- **Display serif**: untuk ANGKA BESAR SAJA (saldo total, safe-to-spend, angka nominal laporan).
  Inilah identity motif: "angka rumah tangga" yang terasa seperti tulisan tangan rapi di buku kas.
- **Body: Manrope** (sudah dipakai; tidak diganti demi konsistensi & performa).

Aturan angka: selalu `tabular-nums`, format id-ID, simbol Rp melalui utilitas `formatRupiah`.

## Komposisi & Radius

- Radius besar lembut (2xl/3xl) untuk kartu & modal, xl untuk kontrol input; TIDAK semua pill.
- Bayangan rendah dan langka: elevation hanya pada elemen mengambang (FAB, modal, sheet).
- Satu titik fokus per layar: di dashboard = kartu saldo (serif display); di modal form = input nominal.

## Aturan Warna Modul (pemutusan masa lalu)

Ikon/badge modul navigasi TIDAK lagi masing-masing berwarna-warni (amber/ungu/mawar/biru/teal).
Modul memakai warna teks standar + aksen state aktif primary; badge angka pakai semantic peringatan.
Alasan: palet maksimal 3 core + 1 aksen; warna-warni modul menembus batas palet dan mengurangi hierarki.

## Keputusan Interaksi

- Tap target minimum 44px untuk kontrol primer mobile (segmented control & chip dinaikkan bila kurang).
- Setiap layar data punya empty/loading/error state (sudah ada pola EmptyState & LoadingSkeleton; wajib dipakai).
- Keyboard: dialog/sheet bisa ditutup Escape; fokus terlihat di kedua tema.
- Copy: bahasa Indonesia nyata keluarga (Tidak ada istilah bisnis korporat). Tanpa em dash.
