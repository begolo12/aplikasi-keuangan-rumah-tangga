/**
 * Sumber tunggal label modul navigasi.
 *
 * Sebelum ini label modul ditulis ulang di tiga tempat (SidebarNav, BottomNav,
 * TopHeader) sehingga rawan menyimpang: modul yang sama bisa muncul dengan nama
 * berbeda tergantung dari mana pengguna melihatnya. Mulai sekarang ketiga
 * navigasi mengambil label dari sini.
 *
 * Dua varian label:
 * - `NAV_TAB_LABELS`       -> label panjang, dipakai SidebarNav (desktop) dan TopHeader.
 * - `NAV_TAB_SHORT_LABELS` -> label pendek untuk ruang sempit (BottomNav, grid ikon).
 *   Bila tidak ada padanan pendek, otomatis jatuh ke label panjang.
 *
 * Ikon TIDAK ditaruh di sini agar berkas ini bebas dari dependensi React dan
 * tetap aman diimpor dari mana pun.
 */

export type NavTab =
  | 'dashboard'
  | 'transactions'
  | 'calendar'
  | 'budget'
  | 'reports'
  | 'evaluation'
  | 'wallets'
  | 'bills'
  | 'subscriptions'
  | 'debts'
  | 'assets'
  | 'goals'
  | 'household'
  | 'settings';

/** Urutan kanonik tab, dipakai untuk navigasi keyboard dan validasi. */
export const NAV_TAB_ORDER: NavTab[] = [
  'dashboard',
  'transactions',
  'calendar',
  'budget',
  'reports',
  'evaluation',
  'wallets',
  'bills',
  'subscriptions',
  'debts',
  'assets',
  'goals',
  'household',
  'settings',
];

export const NAV_TAB_LABELS: Record<NavTab, string> = {
  dashboard: 'Beranda',
  transactions: 'Riwayat Transaksi',
  calendar: 'Kalender',
  budget: 'Anggaran Bulanan',
  reports: 'Laporan & Ekspor',
  evaluation: 'Evaluasi Keuangan',
  wallets: 'Pos Kas & Rekening',
  bills: 'Tagihan Rutin',
  subscriptions: 'Langganan',
  debts: 'Hutang & Piutang',
  assets: 'Aset & Depresiasi',
  goals: 'Target Tabungan',
  household: 'Kas Keluarga Bersama',
  settings: 'Pengaturan & Backup',
};

export const NAV_TAB_SHORT_LABELS: Partial<Record<NavTab, string>> = {
  transactions: 'Transaksi',
  budget: 'Anggaran',
  reports: 'Laporan',
  evaluation: 'Evaluasi',
  wallets: 'Dompet',
  bills: 'Tagihan',
  debts: 'Hutang',
  goals: 'Target',
  assets: 'Aset',
  household: 'Keluarga',
  settings: 'Pengaturan',
};

/** Label panjang modul; aman untuk tab tak dikenal. */
export function navTabLabel(tab: NavTab): string {
  return NAV_TAB_LABELS[tab] ?? tab;
}

/** Label pendek modul; jatuh ke label panjang bila tidak ada padanan pendek. */
export function navTabShortLabel(tab: NavTab): string {
  return NAV_TAB_SHORT_LABELS[tab] ?? NAV_TAB_LABELS[tab] ?? tab;
}
