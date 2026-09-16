/**
 * Fragmen SQL bersama untuk agregat arus kas.
 * `admin_fee` disimpan pada baris transaksi yang sama (bukan baris pendamping),
 * jadi harus ditambahkan eksplisit ke pengeluaran. Tanpa ini laporan tahunan dan
 * per kategori menampilkan angka lebih kecil daripada laporan bulanan/dashboard.
 * Prasyarat: FROM transactions memakai alias `t`.
 */
export const TRANSACTION_INCOME_SQL = `COALESCE(SUM(CASE WHEN t.type = 'income' THEN t.amount ELSE 0 END), 0)`;

export const TRANSACTION_EXPENSE_SQL = `(COALESCE(SUM(CASE WHEN t.type = 'expense' THEN t.amount ELSE 0 END), 0) + COALESCE(SUM(t.admin_fee), 0))`;

/** Untuk query yang sudah menyaring satu jenis di WHERE; biaya admin selalu ikut. */
export const TRANSACTION_AMOUNT_WITH_FEE_SQL = `COALESCE(SUM(t.amount + t.admin_fee), 0)`;
