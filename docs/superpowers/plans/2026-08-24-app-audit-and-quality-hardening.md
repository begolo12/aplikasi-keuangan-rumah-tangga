# Rencana Lanjutan: Perbaikan Seluruh GAP & Penguatan Aplikasi Keuangan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Memperbaiki 4 temuan GAP pada logika UI/UX, relasi database, dan modal transaksi, serta menambahkan automated test suite untuk menjamin zero-gap & zero-regression.

**Architecture:** Next.js 16 App Router (Turbopack) dengan PostgreSQL ACID transactions, Zod validation, Tailwind CSS, dan IndexedDB offline queue.

**Tech Stack:** Next.js 16, TypeScript 5, `@neondatabase/serverless`, Phosphor Icons, Zod.

---

## Global Constraints

- Transaksi ACID pada PostgreSQL tidak boleh dilonggarkan (`withTransaction` + `SELECT ... FOR UPDATE`).
- Saldo dompet tidak boleh negatif untuk `expense` dan `transfer`.
- Isolasi multi-tenant wajib dipertahankan (`user_id = $1`).

---

### Task 1: Perbaikan GAP State Inconsistency di Modal Transaksi

**Files:**
- Modify: `src/components/transactions/TransactionModal.tsx:40-75`

**Permasalahan:**
1. Mengubah tipe transaksi (Pengeluaran $\leftrightarrow$ Pemasukan) mempertahankan `categoryId` lama yang tidak cocok dengan tipe baru.
2. Memilih dompet transfer yang sama dengan dompet tujuan tidak otomatis memilih dompet lain yang valid.

- [ ] **Step 1: Tambahkan auto-reset categoryId saat tipe transaksi berganti**
- [ ] **Step 2: Tambahkan auto-select toWalletId saat walletId berubah pada mode transfer**
- [ ] **Step 3: Uji interaksi pergantian tipe transaksi dan transfer kas**

---

### Task 2: Perbaikan GAP UX Hapus Transaksi pada Mobile Touch Screen

**Files:**
- Modify: `src/components/transactions/TransactionItem.tsx:98-106`

**Permasalahan:**
Class `opacity-0 group-hover:opacity-100` menyembunyikan tombol hapus transaksi pada perangkat layar sentuh (mobile/tablet) yang tidak mendukung hover.

- [ ] **Step 1: Ubah kelas tombol menjadi `opacity-100 md:opacity-0 md:group-hover:opacity-100`**
- [ ] **Step 2: Verifikasi tampilan dan aksesibilitas tombol di mobile & desktop**

---

### Task 3: Hardening Integritas Database & Deletion Safety

**Files:**
- Modify: `src/app/api/categories/[id]/route.ts`
- Modify: `src/app/api/bills/[id]/route.ts`

**Permasalahan:**
Penghapusan kategori yang masih digunakan dalam transaksi perlu memberikan informasi peringatan yang jelas kepada user.

- [ ] **Step 1: Tambahkan pengecekan transaksi terkait sebelum menghapus kategori**
- [ ] **Step 2: Tambahkan penghapusan payment logs saat tagihan rutin dihapus**
- [ ] **Step 3: Uji respon API DELETE category & bill**

---

### Task 4: Pembuatan Automated Test Suite Mandiri (ACID & Validations)

**Files:**
- Create: `scripts/audit-self-test.ts`
- Modify: `package.json`

- [ ] **Step 1: Buat skrip assertion unit test untuk Zod schemas, transfer validity, dan formatting**
- [ ] **Step 2: Tambahkan skrip `npm run test:audit` di `package.json`**
- [ ] **Step 3: Jalankan seluruh automated test dan verifikasi hasil 100% PASS**

---

## Verification Plan

### Automated Tests
- `npm run test:audit` (Menjalankan suite assertion validasi & logika transaksi)
- `npm run build` (Next.js full production build & TypeScript validation)

### Manual Verification
- Cek Modal Catat Transaksi: ganti Pengeluaran $\rightarrow$ Pemasukan, pastikan kategori otomatis pindah ke kategori pemasukan.
- Cek di mobile viewport: tombol hapus transaksi muncul jelas dan berfungsi saat diklik.
