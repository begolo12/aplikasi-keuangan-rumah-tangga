# 💰 KasKeluarga — Aplikasi Manajemen Keuangan Rumah Tangga

Aplikasi pencatatan dan manajemen keuangan keluarga modern berstandar **PWA (*Progressive Web App*)** multi-perangkat (Android, iOS, Windows, macOS), adaptif (**Sidebar** pada PC/Tablet dan **Bottom Nav Bar** pada Mobile), dengan **Sistem Multi-User Data Isolation** (setiap akun memiliki database keuangan independen), terhubung ke **Neon Serverless Postgres**, dan siap dideploy ke **Vercel**.

---

## 🌟 Fitur Unggulan

- 🔒 **Multi-User Data Isolation**: Setiap akun yang mendaftar memiliki data dompet, kategori, transaksi, anggaran, dan tagihan masing-masing yang terisolasi 100%.
- ⚡ **Pencatatan Cepat (< 5 Detik)**: Tombol preset nominal cepat (`+10rb`, `+50rb`, `+100rb`, `+500rb`, `+1jt`), live format Rupiah, dan autocomplete catatan sering dipakai.
- 📱 **Adaptive Responsive Design**:
  - **PC / Laptop ($\ge 1024\text{px}$)**: Full Sidebar navigasi (260px) + Dashboard Grid 3 Kolom + Centered Dialog Modal.
  - **Tablet ($768\text{px} - 1023\text{px}$)**: Compact Rail Sidebar + 2 Kolom Grid.
  - **Mobile ($< 768\text{px}$)**: Bottom Navigation Bar + FAB (`+`) + Slide-up Bottom Sheet.
- 📶 **PWA & Offline-First**: Dapat di-install di Home Screen Android, Windows, macOS, dan iOS Safari. Transaksi saat offline tersimpan di **IndexedDB** dan otomatis tersinkronisasi saat terhubung internet kembali.
- 🎯 **Validasi Saldo Ketat (*Strict Zero*)**: Mencegah pengeluaran atau transfer melebihi saldo dompet yang tersedia.
- 📊 **Anggaran Bulanan Real-Time**: Progress bar visual dengan 4 status tingkatan (*Aman, Waspada, Kritis, Overbudget*).
- 🧾 **Tagihan Rutin & Smart Badge**: Indikator pintar untuk tagihan jatuh tempo dalam 3 hari ke depan ($H-3$) atau menunggak, dengan tombol pelunasan 1-klik yang otomatis mendebit saldo dompet dan mencatat transaksi pengeluaran.
- 📈 **Grafik Analitik & Ekspor CSV**: Donut Chart komposisi pengeluaran kategori, Bar Chart arus kas harian, dan unduh CSV siap buka & siap rumus di Excel / Google Sheets.
- 💾 **Cadangan & Pemulihan Data (Backup & Restore)**: Ekspor dan pulihkan seluruh basis data ke file `.json` kapan saja.

---

## 🛠️ Arsitektur Teknologi

- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS + HSL Design System Tokens + Dark Mode
- **Typography**: Manrope (Google Fonts via `next/font/google` offline-ready)
- **Icons**: Phosphor Icons (`@phosphor-icons/react`)
- **Visualisasi**: Recharts
- **Database**: Neon Serverless Postgres (`@neondatabase/serverless`)
- **Autentikasi**: JWT Session Tokens (`jose`) disimpan dalam `httpOnly` Secure Cookies + Password Hash (`bcryptjs`)
- **Validasi**: Zod Schema Validation

---

## 🚀 Panduan Menjalankan Secara Lokal

1. **Clone Repositori**:
   ```bash
   git clone https://github.com/begolo12/aplikasi-keuangan-rumah-tangga.git
   cd aplikasi-keuangan-rumah-tangga
   ```

2. **Install Dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment Variables**:
   Buat file `.env.local`:
   ```env
   DATABASE_URL=postgresql://neondb_owner:password@ep-wild-glade-az8mlt0u-pooler.c-3.ap-southeast-1.aws.neon.tech/neondb?sslmode=require
   JWT_SECRET=super_secret_jwt_key_keuangan_keluarga_2026
   ```

4. **Inisialisasi Database Neon Postgres**:
   Jalankan server lokal, lalu buka browser atau lakukan request `POST` ke:
   ```
   http://localhost:3000/api/init
   ```
   *(Semua tabel skema dan relasi multi-user akan dibuat secara otomatis).*

5. **Jalankan Mode Pengembangan**:
   ```bash
   npm run dev
   ```
   Buka `http://localhost:3000` di browser Anda.

---

## 📲 Panduan Instalasi PWA

- **Android (Chrome)**: Buka website di Chrome, ketuk banner pop-up *"Tambahkan ke Layar Utama"* atau menu titik tiga -> *Install App*.
- **iOS / iPadOS (Safari)**: Buka website di Safari, ketuk tombol **Bagikan (Share)** di bar bawah, lalu pilih **"Tambahkan ke Layar Utama" (Add to Home Screen)**.
- **PC / Laptop (Chrome / Edge)**: Klik ikon install di ujung kanan bilah alamat (address bar) browser.

---

## 🚢 Deploy ke Vercel

1. Push kode ke repositori GitHub `begolo12/aplikasi-keuangan-rumah-tangga`.
2. Buka dashboard [Vercel](https://vercel.com) -> **Add New Project** -> Import repositori GitHub tersebut.
3. Masukkan Environment Variables di Vercel:
   - `DATABASE_URL` : URL koneksi Neon Postgres Anda.
   - `JWT_SECRET` : Kunci rahasia token JWT Anda.
4. Klik **Deploy**. Aplikasi akan live dalam hitungan detik.
