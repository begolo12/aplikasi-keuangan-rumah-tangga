/**
 * Palet warna terpusat untuk chart & pemilih warna dompet.
 *
 * Sebelum ini warna ditulis sebagai hex literal di tiga tempat berbeda
 * (CategoryChart, CashflowChart, WalletsView) sehingga bisa menyimpang dan
 * tidak ikut berubah saat mode gelap. Semua nilai di sini memakai CSS variable
 * token semantik (`--color-*`) supaya otomatis menyesuaikan tema.
 *
 * Aturan DESIGN.md: palet maksimal 3 warna inti (primary, expense, income)
 * ditambah aksen semantik (transfer, warning). Urutan palet chart sengaja
 * dimulai dari primary agar potongan terbesar pada diagram mendapat warna
 * utama, lalu diselingi aksen agar potongan yang berdekatan tetap terbedakan.
 */

/** Token CSS variable yang dipakai chart, dalam urutan prioritas. */
export const CHART_PALETTE = [
  'hsl(var(--color-primary))',
  'hsl(var(--color-transfer))',
  'hsl(var(--color-warning))',
  'hsl(var(--color-income))',
  'hsl(var(--color-expense))',
  'hsl(var(--color-primary-deep))',
  'hsl(var(--color-primary-hover))',
  'hsl(var(--color-text-muted))',
] as const;

/** Warna bar/garis per jenis arus kas. */
export const CHART_COLOR_INCOME = 'hsl(var(--color-income))';
export const CHART_COLOR_EXPENSE = 'hsl(var(--color-expense))';

/** Warna netral untuk seri yang tidak punya makna semantik. */
export const CHART_COLOR_NEUTRAL = 'hsl(var(--color-text-muted))';

/**
 * Warna teks di atas bidang berwarna penuh (badge/chip/dot).
 * Memakai token `*-fg` yang sudah dirancang kontras: putih di mode terang,
 * gelap di mode gelap. Menghindari hex putih mentah yang gagal di mode gelap.
 */
export const ON_COLOR_TEXT = 'hsl(var(--color-primary-fg))';

/**
 * Warna pratinjau untuk pemilih warna dompet.
 *
 * Kunci (`emerald`, `blue`, ...) sengaja dipertahankan sama dengan kunci lama
 * di CategoryIcon.COLOR_MAP dan dengan nilai `color` yang sudah tersimpan di
 * database, jadi tidak dibutuhkan migrasi data. Yang berubah hanya cara
 * menampilkannya: kini lewat token semantik, bukan hex mentah.
 */
export const WALLET_COLOR_SWATCHES: Record<string, string> = {
  emerald: 'hsl(var(--color-primary))',
  teal: 'hsl(var(--color-primary-hover))',
  blue: 'hsl(var(--color-transfer))',
  indigo: 'hsl(var(--color-transfer))',
  purple: 'hsl(var(--color-transfer))',
  orange: 'hsl(var(--color-expense))',
  amber: 'hsl(var(--color-warning))',
  rose: 'hsl(var(--color-expense))',
  red: 'hsl(var(--color-expense))',
  green: 'hsl(var(--color-income))',
  gray: 'hsl(var(--color-text-muted))',
};

/** Ambil warna pratinjau dompet; jatuh ke netral bila kunci tak dikenal. */
export function walletColorSwatch(color: string): string {
  return WALLET_COLOR_SWATCHES[color] ?? CHART_COLOR_NEUTRAL;
}

/** Ambil warna chart ke-`index` secara melingkar. */
export function chartColorAt(index: number): string {
  return CHART_PALETTE[index % CHART_PALETTE.length];
}
