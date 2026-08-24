import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { transactionSchema, transactionListQuerySchema } from '@/lib/validations';
import { handleRouteError, BusinessError, readJsonBody } from '@/lib/apiHelpers';
import { Transaction } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';

const IDEMPOTENCY_KEY_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const sp = req.nextUrl.searchParams;
    const q = transactionListQuerySchema.parse({
      month: sp.get('month') ?? undefined,
      year: sp.get('year') ?? undefined,
      type: sp.get('type') ?? undefined,
      wallet_id: sp.get('wallet_id') ?? undefined,
      category_id: sp.get('category_id') ?? undefined,
      search: sp.get('search') ?? undefined,
      limit: sp.get('limit') ?? undefined,
      offset: sp.get('offset') ?? undefined,
    });

    // Join metadata diikat pemiliknya: FK silang tidak bisa membocorkan nama user lain.
    let sql = `
      SELECT
        t.id, t.user_id, t.type, t.amount, t.admin_fee, t.category_id,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        t.wallet_id, w.name as wallet_name, w.icon as wallet_icon,
        t.to_wallet_id, tw.name as to_wallet_name,
        t.description, t.date, t.created_at, t.updated_at
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id AND c.user_id = t.user_id
      LEFT JOIN wallets w ON t.wallet_id = w.id AND w.user_id = t.user_id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id AND tw.user_id = t.user_id
      WHERE t.user_id = $1
    `;

    const params: unknown[] = [session.userId];
    let paramIndex = 2;

    if (q.month && q.year) {
      sql += ` AND EXTRACT(MONTH FROM t.date) = $${paramIndex} AND EXTRACT(YEAR FROM t.date) = $${paramIndex + 1}`;
      params.push(q.month, q.year);
      paramIndex += 2;
    } else if (q.year) {
      sql += ` AND EXTRACT(YEAR FROM t.date) = $${paramIndex}`;
      params.push(q.year);
      paramIndex += 1;
    }

    if (q.type) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(q.type);
      paramIndex += 1;
    }

    if (q.wallet_id) {
      sql += ` AND (t.wallet_id = $${paramIndex} OR t.to_wallet_id = $${paramIndex})`;
      params.push(q.wallet_id);
      paramIndex += 1;
    }

    if (q.category_id) {
      sql += ` AND t.category_id = $${paramIndex}`;
      params.push(q.category_id);
      paramIndex += 1;
    }

    if (q.search && q.search.trim() !== '') {
      sql += ` AND (t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      params.push(`%${q.search.trim()}%`);
      paramIndex += 1;
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(q.limit, q.offset);

    const transactions = await query<Transaction>(sql, params);

    return NextResponse.json({ success: true, data: transactions });
  } catch (error) {
    return handleRouteError(error, 'transactions:list');
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const validated = transactionSchema.parse(await readJsonBody(req));

    // Kunci idempotency dari offline queue: replay dengan key sama mengembalikan transaksi lama.
    const rawKey = req.headers.get('idempotency-key');
    let idempotencyKey: string | null = null;
    if (rawKey && !IDEMPOTENCY_KEY_PATTERN.test(rawKey)) {
      throw new BusinessError('Idempotency-Key harus UUID valid.');
    }
    idempotencyKey = rawKey;

    const result = await withTransaction(async (client) => {
      if (idempotencyKey) {
        const existing = await client.query(
          'SELECT * FROM transactions WHERE user_id = $1 AND idempotency_key = $2',
          [session.userId, idempotencyKey]
        );
        if (existing.rows.length > 0) {
          return { row: existing.rows[0], replayed: true };
        }
      }

      // Kategori wajib milik user ini dan sesuai tipe transaksi.
      if (validated.category_id) {
        const owned = await client.query('SELECT type FROM categories WHERE id = $1 AND user_id = $2', [
          validated.category_id,
          session.userId,
        ]);
        if (owned.rows.length === 0) {
          throw new BusinessError('Kategori tidak ditemukan pada akun Anda.');
        }
        const expectedType = validated.type === 'income' ? 'income' : 'expense';
        if (validated.type !== 'transfer' && owned.rows[0].type !== expectedType) {
          throw new BusinessError('Tipe kategori tidak cocok dengan tipe transaksi.');
        }
      }

      // Urutan lock kanonik berdasarkan UUID mencegah deadlock transfer berlawanan arah.
      const lockIds = [validated.wallet_id, ...(validated.to_wallet_id ? [validated.to_wallet_id] : [])].sort();
      const locked = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = ANY($1::uuid[]) AND user_id = $2 ORDER BY id FOR UPDATE',
        [lockIds, session.userId]
      );
      if (locked.rows.length !== lockIds.length) {
        throw new BusinessError('Dompet tidak ditemukan.', 404);
      }

      const sourceWallet = locked.rows.find((r: { id: string }) => r.id === validated.wallet_id);
      const destWallet = validated.to_wallet_id
        ? locked.rows.find((r: { id: string }) => r.id === validated.to_wallet_id)
        : null;

      const totalDebit =
        validated.type === 'transfer' ? validated.amount + (validated.admin_fee || 0) : validated.amount;

      // Invarian strict-zero untuk expense dan transfer.
      if (
        (validated.type === 'expense' || validated.type === 'transfer') &&
        parseFloat(sourceWallet.balance) < totalDebit
      ) {
        throw new BusinessError(
          `Saldo ${sourceWallet.name} tidak mencukupi. (Tersedia: ${formatRupiah(sourceWallet.balance)}, Dibutuhkan: ${formatRupiah(totalDebit)})`
        );
      }

      if (validated.type === 'expense') {
        await client.query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [
          validated.amount,
          validated.wallet_id,
          session.userId,
        ]);
      } else if (validated.type === 'income') {
        await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [
          validated.amount,
          validated.wallet_id,
          session.userId,
        ]);
      } else if (destWallet) {
        await client.query('UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [
          totalDebit,
          validated.wallet_id,
          session.userId,
        ]);
        await client.query('UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2 AND user_id = $3', [
          validated.amount,
          validated.to_wallet_id,
          session.userId,
        ]);
      }

      const insertedTrx = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date, idempotency_key
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *`,
        [
          session.userId,
          validated.type,
          validated.amount,
          validated.admin_fee || 0,
          validated.category_id || null,
          validated.wallet_id,
          validated.to_wallet_id || null,
          validated.description || null,
          validated.date,
          idempotencyKey,
        ]
      );

      return { row: insertedTrx.rows[0], replayed: false };
    });

    return NextResponse.json({ success: true, data: result.row, replayed: result.replayed });
  } catch (error) {
    return handleRouteError(error, 'transactions:create');
  }
}
