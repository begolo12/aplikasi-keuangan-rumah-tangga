/**
 * Rate limiting best effort dengan sliding window in-memory.
 *
 * CATATAN JUJUR: penyimpanan Map ini hanya hidup per instance proses. Di
 * lingkungan serverless multi-instance (mis. beberapa lamba Neon/Vercel) hitungan
 * TIDAK dibagi antar instance, sehingga limit nyata bisa lebih longgar dari target.
 * Ini penghalang pertama, bukan pengganti rate limiter tingkat edge/WAF.
 */
const windows = new Map<string, number[]>();

export interface RateLimitResult {
  ok: boolean;
  /** Detik sampai slot berikutnya bebas; 0 bila ok. */
  retryAfterSec: number;
}

export function checkRateLimit(key: string, limit: number, windowMs: number): RateLimitResult {
  const now = Date.now();
  
  // Global cleanup when Map exceeds 5000 entries to prevent memory leak
  if (windows.size > 5000) {
    windows.clear();
  }
  
  let arr = windows.get(key);
  if (!arr) {
    arr = [];
  } else {
    // Prune old timestamps within window
    arr = arr.filter((t) => now - t < windowMs);
    
    // Delete empty keys after pruning
    if (arr.length === 0) {
      windows.delete(key);
      return { ok: true, retryAfterSec: 0 };
    }
  }
  
  arr.push(now);
  
  // Bound array size to limit+1 to prevent unbounded growth
  if (arr.length > limit + 1) {
    arr = arr.slice(-limit);
  }
  
  windows.set(key, arr);
  
  if (arr.length > limit) {
    const oldest = arr[0];
    const retryAfterSec = Math.max(1, Math.ceil((windowMs - (now - oldest)) / 1000));
    return { ok: false, retryAfterSec };
  }
  return { ok: true, retryAfterSec: 0 };
}

/**
 * IP klien dari header x-forwarded-for: ambil nilai pertama (client asli),
 * fallback 'unknown' bila header tidak ada.
 */
export function getClientIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) {
    const first = fwd.split(',')[0]?.trim();
    if (first) return first;
  }
  return 'unknown';
}
