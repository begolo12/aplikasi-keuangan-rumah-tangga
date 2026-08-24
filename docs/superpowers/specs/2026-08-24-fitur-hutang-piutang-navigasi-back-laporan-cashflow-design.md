# Design Spec: Modul Hutang-Piutang, Navigasi Back Mobile, dan Laporan Cashflow Komprehensif

- Tanggal: 2026-08-24
- Status: Approved

## 1. Ringkasan Fitur

Menghadirkan modul manajemen Hutang & Piutang keluarga yang terintegrasi penuh dengan dompet kas dan laporan keuangan, menerapkan navigasi mobile back button dengan proteksi keluar aplikasi, serta menambahkan metrik likuiditas nyata *"Safe-to-Spend / Dana Bebas Belanja"* pada dashboard dan laporan.

---

## 2. Arsitektur Basis Data (PostgreSQL)

### A. Tabel `debts`
```sql
CREATE TABLE IF NOT EXISTS debts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('payable', 'receivable')),
  person_name VARCHAR(100) NOT NULL,
  total_amount BIGINT NOT NULL CHECK (total_amount > 0),
  paid_amount BIGINT NOT NULL DEFAULT 0 CHECK (paid_amount >= 0),
  due_date DATE,
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'unpaid' CHECK (status IN ('unpaid', 'partial', 'paid')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debts_user_type ON debts(user_id, type);
CREATE INDEX IF NOT EXISTS idx_debts_user_status ON debts(user_id, status);
```

### B. Tabel `debt_payments`
```sql
CREATE TABLE IF NOT EXISTS debt_payments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  debt_id UUID NOT NULL REFERENCES debts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  wallet_id UUID NOT NULL REFERENCES wallets(id) ON DELETE RESTRICT,
  amount BIGINT NOT NULL CHECK (amount > 0),
  payment_date DATE NOT NULL,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_debt_payments_debt_id ON debt_payments(debt_id);
CREATE INDEX IF NOT EXISTS idx_debt_payments_user_id ON debt_payments(user_id);
```

---

## 3. Alur Transaksi & Integrasi Kas

1. **Pembayaran Hutang (`type = 'payable'`)**:
   - Saldo dompet didebit: `UPDATE wallets SET balance = balance - $amount WHERE id = $wallet_id AND balance >= $amount`.
   - Data cicilan dicatat di `debt_payments`.
   - Nilai `paid_amount` pada `debts` bertambah: `paid_amount = paid_amount + $amount`.
   - Status otomatis diperbarui (`paid` jika `paid_amount >= total_amount`, selain itu `partial`).
   - Transaksi pengeluaran otomatis dicatat di `transactions` dengan kategori "Bayar Hutang".

2. **Penerimaan Pembayaran Piutang (`type = 'receivable'`)**:
   - Saldo dompet dikredit: `UPDATE wallets SET balance = balance + $amount WHERE id = $wallet_id`.
   - Data pelunasan dicatat di `debt_payments`.
   - Nilai `paid_amount` pada `debts` bertambah.
   - Status otomatis diperbarui (`paid` jika `paid_amount >= total_amount`, selain itu `partial`).
   - Transaksi pemasukan otomatis dicatat di `transactions` dengan kategori "Pelunasan Piutang".

---

## 4. Formula Safe-to-Spend & Laporan Cashflow

$$\text{Safe-to-Spend} = \text{Total Saldo Dompet Riil} - (\text{Tagihan Rutin Belum Dibayar} + \text{Hutang Jatuh Tempo Bulan Ini}) + \text{Piutang Jatuh Tempo Bulan Ini}$$

Hasil perhitungan ini ditampilkan secara visual di:
- **BalanceHeader Dashboard**: Widget interaktif "Sisa Dana Bebas Belanja" dengan indikator status likuiditas.
- **ReportsView**: Breakdown komprehensif arus kas, beban kewajiban bulanan, dan proyeksi likuiditas.

---

## 5. Sistem Navigasi Mobile Back & Dialog Konfirmasi Keluar

- Memasang event listener `popstate` dan `window.history.pushState` pada pergantian tab & modal.
- Urutan penanganan tombol Back:
  1. Jika ada Modal yang terbuka (`TransactionModal`, `AddDebtModal`, `PayModal`, dll) $\rightarrow$ Tutup modal.
  2. Jika sedang di tab selain Beranda (`debts`, `budget`, `wallets`, `reports`, `bills`, `settings`) $\rightarrow$ Kembali ke tab sebelumnya dalam history stack.
  3. Jika sudah berada di Beranda (`dashboard`) $\rightarrow$ Tampilkan toast/dialog konfirmasi: *"Tekan sekali lagi untuk keluar dari aplikasi"* dengan jendela waktu 2 detik.
