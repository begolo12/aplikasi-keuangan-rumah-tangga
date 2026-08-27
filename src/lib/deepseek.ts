import { ParsedReceiptResult } from './types';
import { parsedReceiptResultSchema } from './validations';

export interface DeepSeekParsePayload {
  text: string;
  categories?: Array<{ id: string; name: string; type: 'expense' | 'income' }>;
  wallets?: Array<{ id: string; name: string; type: string }>;
}

/**
 * Server-only helper untuk mengekstraksi data transaksi dari teks struk / SMS banking
 * menggunakan DeepSeek API (deepseek-v4-flash / kompatibel).
 * 
 * Keamanan: API key dibaca murni dari process.env (server-side only) dan tidak bocor ke client.
 */
export async function parseReceiptWithDeepSeek(payload: DeepSeekParsePayload): Promise<ParsedReceiptResult> {
  const apiKey = process.env.DEEPSEEK_API_KEY;
  const baseUrl = process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com';
  const model = process.env.DEEPSEEK_MODEL || 'deepseek-v4-flash';

  const today = new Date().toISOString().split('T')[0];

  // Fallback heuristik ringan bila API key belum diset atau offline
  if (!apiKey || apiKey.trim() === '' || apiKey.includes('your_deepseek_api_key_here')) {
    return extractHeuristicReceipt(payload.text, today, payload.categories, payload.wallets);
  }

  const categoryListStr = (payload.categories || [])
    .map((c) => `- ID: "${c.id}", Nama: "${c.name}", Tipe: "${c.type}"`)
    .join('\n');

  const walletListStr = (payload.wallets || [])
    .map((w) => `- ID: "${w.id}", Nama: "${w.name}", Tipe: "${w.type}"`)
    .join('\n');

  const systemPrompt = `Kamu adalah asisten akuntan keuangan keluarga Indonesia yang sangat teliti.
Tugasmu adalah menganalisis teks struk belanja, nota, bukti transfer bank, mutasi, atau SMS banking, lalu mengekstrak data transaksi ke dalam format JSON tunggal yang valid.

Aturan Ekstraksi:
1. "amount": Angka nominal total akhir transaksi (number murni tanpa titik/koma/Rp). Contoh: 45000. Jika ada diskon/pajak, ambil TOTAL akhir yang dibayar/diterima.
2. "type": 'expense' (pengeluaran/belanja/debit/transfer keluar) atau 'income' (pemasukan/gaji/transfer masuk/kredit). Default 'expense'.
3. "date": Tanggal transaksi dalam format "YYYY-MM-DD". Jika di struk hanya tertulis misal "28/08/2026" atau "28 Aug", konversikan ke format ISO "YYYY-MM-DD". Jika tidak ada tahun/tanggal sama sekali, gunakan tanggal hari ini: "${today}".
4. "description": Nama merchant / toko / tujuan belanja singkat, maksimal 100 karakter. Contoh: "Indomaret Point", "Superindo", "SPBU Pertamina", "Makan Siang Warteg".
5. "merchant": Nama toko atau penerima bila terdeteksi (opsional, string).
6. "suggested_category_id": Pilih satu ID kategori yang PALING COCOK dari daftar kategori user berikut (berikan string ID-nya persis atau null jika tidak ada yang cocok):
${categoryListStr || '(Tidak ada daftar kategori)'}
7. "suggested_wallet_id": Pilih satu ID dompet yang terindikasi dipakai (misal BCA, Mandiri, Gopay, ShopeePay, Kas Tunai) dari daftar dompet user berikut (berikan string ID-nya persis atau null):
${walletListStr || '(Tidak ada daftar dompet)'}
8. "items": Daftar item belanja jika ada (array objek { name: string, price: number, qty?: number }).
9. "confidence": "high" | "medium" | "low".

PENTING: Keluarkan HANYA raw JSON object yang valid tanpa markdown code block wrap \`\`\`json jika memungkinkan, atau valid JSON object.`;

  try {
    const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey.trim()}`,
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `Berikut teks struk/nota/SMS transaksi:\n\n${payload.text}` },
        ],
        temperature: 0.1,
        response_format: { type: 'json_object' },
      }),
      signal: AbortSignal.timeout(30000), // Timeout 30 detik untuk mengakomodasi reasoning AI
    });


    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn(`DeepSeek API returned error ${res.status}:`, errText);
      // Fallback ke heuristik jika DeepSeek rate-limited / error
      return extractHeuristicReceipt(payload.text, today, payload.categories, payload.wallets);
    }

    const data = await res.json();
    const rawContent = data.choices?.[0]?.message?.content;
    if (!rawContent) {
      return extractHeuristicReceipt(payload.text, today, payload.categories, payload.wallets);
    }

    // Bersihkan kemungkinan markdown formatting
    const cleaned = rawContent.trim().replace(/^```json\s*/i, '').replace(/```$/i, '').trim();
    const parsed = JSON.parse(cleaned);

    const validated = parsedReceiptResultSchema.safeParse({
      amount: Number(parsed.amount) || 0,
      type: parsed.type === 'income' ? 'income' : 'expense',
      date: typeof parsed.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(parsed.date) ? parsed.date : today,
      description: String(parsed.description || 'Transaksi Struk/Nota').slice(0, 100),
      merchant: parsed.merchant || null,
      suggested_category_id: parsed.suggested_category_id || null,
      suggested_wallet_id: parsed.suggested_wallet_id || null,
      items: Array.isArray(parsed.items) ? parsed.items.map((it: { name?: string; price?: number; qty?: number }) => ({
        name: String(it.name || ''),
        price: Number(it.price) || 0,
        qty: Number(it.qty) || 1,
      })) : [],
      confidence: parsed.confidence || 'high',
    });

    if (validated.success) {
      return validated.data;
    }

    return extractHeuristicReceipt(payload.text, today, payload.categories, payload.wallets);
  } catch (err) {
    console.error('Failed to parse with DeepSeek, using heuristic fallback:', err);
    return extractHeuristicReceipt(payload.text, today, payload.categories, payload.wallets);
  }
}

/**
 * Heuristic parser fallback: Mengekstrak angka total dan tanggal sederhana
 * tanpa bergantung ke API eksternal bila koneksi terputus.
 */
export function extractHeuristicReceipt(
  text: string,
  defaultDate: string,
  categories?: Array<{ id: string; name: string; type: 'expense' | 'income' }>,
  wallets?: Array<{ id: string; name: string; type: string }>
): ParsedReceiptResult {
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
  
  // Deteksi nominal total (mencari kata TOTAL, GRAND TOTAL, BAYAR, RP, dll)
  let foundAmount = 0;
  const totalRegex = /(?:total|grand\s*total|bayar|netto|tagihan|rp\.?|nominal)[:\s]*([0-9.,]+)/i;
  
  for (let i = lines.length - 1; i >= 0; i--) {
    const line = lines[i];
    const match = line.match(totalRegex);
    if (match && match[1]) {
      const cleanNum = match[1].replace(/\./g, '').replace(/,/g, '');
      const val = parseInt(cleanNum, 10);
      if (!isNaN(val) && val > 0) {
        foundAmount = val;
        break;
      }
    }
  }

  // Jika belum dapat, cari angka terbesar di dalam teks
  if (foundAmount === 0) {
    const allNumbers = text.match(/\b\d{1,3}(?:\.\d{3})+(?:,\d{2})?\b|\b\d{4,9}\b/g) || [];
    let max = 0;
    for (const numStr of allNumbers) {
      const clean = parseInt(numStr.replace(/\./g, '').replace(/,/g, ''), 10);
      if (!isNaN(clean) && clean > max && clean < 500000000) { // Filter tahun/id panjang
        max = clean;
      }
    }
    foundAmount = max;
  }

  // Deteksi nama toko/merchant (biasanya baris pertama atau kedua)
  const firstLine = lines[0] || 'Belanja Nota/Struk';
  const desc = firstLine.length > 50 ? firstLine.slice(0, 50) : firstLine;

  // Tebak kategori dari kata kunci
  let suggestedCatId: string | null = null;
  const textLower = text.toLowerCase();
  if (categories && categories.length > 0) {
    const catMatch = categories.find((c) => {
      const name = c.name.toLowerCase();
      return textLower.includes(name) || (name.includes('makan') && (textLower.includes('resto') || textLower.includes('cafe') || textLower.includes('warung') || textLower.includes('kopi')));
    });
    if (catMatch) suggestedCatId = catMatch.id;
  }

  // Tebak dompet dari kata kunci
  let suggestedWalletId: string | null = null;
  if (wallets && wallets.length > 0) {
    const wallMatch = wallets.find((w) => textLower.includes(w.name.toLowerCase()));
    if (wallMatch) suggestedWalletId = wallMatch.id;
  }

  return {
    amount: foundAmount,
    type: 'expense',
    date: defaultDate,
    description: desc,
    merchant: desc,
    suggested_category_id: suggestedCatId,
    suggested_wallet_id: suggestedWalletId,
    items: [],
    confidence: 'low',
  };
}
