# Plan: Audit Visual Komprehensif & Redesain Sidebar Modern Kelas Atas

- Tanggal: 2026-08-24
- Status: done

## Tujuan
Melakukan audit visual menyeluruh pada antarmuka sidebar navigasi (tipografi, hierarki, perataan, warna, kontras, serta penempatan elemen) dan menerapkan *redesign* modern berstandar SaaS kelas atas (terinspirasi Linear, Apple, dan Vercel) agar terlihat elegan, profesional, nyaman dipandang, dan proporsional.

## Temuan Audit Visual & Rencana Perbaikan
1. **Header Brand & Identitas**:
   - *Masalah*: Ikon dan teks KasPribadi kaku, teks sub-judul "KAS IRVAN" huruf kapital penuh terlihat berat.
   - *Solusi*: Terapkan logo squircle modern dengan bayangan halus, tipografi judul tajam (`tracking-tight text-sm font-extrabold`), dan sub-nama kas berformat rapi (*Title Case* / *Muted Pill*).
2. **Tombol "+ Catat Transaksi"**:
   - *Masalah*: Tombol kapsul terasa tebal (*chunky*) dan ikon pintasan keyboard tidak proporsional.
   - *Solusi*: Redesain menjadi tombol aksi utama yang ramping (*sleek action button*), bayangan primer bercahaya lembut (*subtle glowing shadow*), dan menu popover dropdown yang bersih dan presisi.
3. **Hierarki Judul Seksi (Section Heads)**:
   - *Masalah*: Teks seksi (*UTAMA*, *KAS & ANGGARAN*, dll.) terlalu berdempetan dan ritme vertikal kurang teratur.
   - *Solusi*: Terapkan *letter-spacing* luas (`tracking-widest text-[9.5px] font-bold text-text-muted/60`), jarak antar seksi yang harmonis (*optical balance*), dan penataan visual yang berirama.
4. **Item Menu & Indikator Aktif (Active / Hover States)**:
   - *Masalah*: Item aktif berupa blok warna hijau pekat yang terlalu mencolok (*blobby*) dibanding item non-aktif yang pucat.
   - *Solusi*: Ganti dengan *modern active styling* (latar lembut `bg-primary/10` dengan teks & ikon aksen `text-primary font-bold` serta border indikator halus), dan hover state yang responsif dengan ikon *duotone*.
5. **Widget Pintasan Keyboard**:
   - *Masalah*: Kotak mengambang di bawah terlihat kaku dan memakan ruang tanpa integrasi yang rapi.
   - *Solusi*: Padatkan widget menjadi kartu mini yang bersih dengan tombol *kbd* modern dan perataan grid 2-kolom yang simetris.
6. **Profil Pengguna & Logout di Bagian Bawah**:
   - *Masalah*: Duplikasi teks nama, avatar kecil, dan tombol logout terisolasi di pojok.
   - *Solusi*: Susun kartu profil pengguna berdensitas pas dengan inisial avatar gradien, badge status akun, dan tombol keluar beranimasi hover halus.

## Ruang Lingkup
- [x] Implementasikan redesain visual lengkap pada [SidebarNav.tsx](file:///f:/APLIKASI-KEUANGAN-GANANG/src/components/layout/SidebarNav.tsx).
- [x] Verifikasi seluruh tombol navigasi, dropdown transaksi, dan pintasan keyboard tetap berfungsi normal.
- [x] Jalankan verifikasi: `npm test`, `npm run lint`, `npm run build`.

## File yang Disentuh
- `docs/plans/2026-08-24-audit-visual-dan-redesain-sidebar-modern.md`
- `src/components/layout/SidebarNav.tsx`
- `changelog.md`

## Kriteria Selesai (Definition of Done)
1. Tampilan sidebar memiliki tipografi, kontras warna, dan hierarki visual kelas atas.
2. Tidak ada teks berantakan, salah perataan, atau penempatan elemen yang canggung.
3. Seluruh unit test dan E2E test lulus 100%.
