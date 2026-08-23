import { NextRequest, NextResponse } from 'next/server';
import { getAuthSession } from '@/lib/auth';
import { query, withTransaction } from '@/lib/db';
import { transactionSchema } from '@/lib/validations';
import { Transaction } from '@/lib/types';
import { formatRupiah } from '@/lib/formatters';

export async function GET(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const searchParams = req.nextUrl.searchParams;
    const month = searchParams.get('month');
    const year = searchParams.get('year');
    const type = searchParams.get('type');
    const walletId = searchParams.get('wallet_id');
    const categoryId = searchParams.get('category_id');
    const search = searchParams.get('search');
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    let sql = `
      SELECT 
        t.id, t.user_id, t.type, t.amount, t.admin_fee, t.category_id,
        c.name as category_name, c.icon as category_icon, c.color as category_color,
        t.wallet_id, w.name as wallet_name, w.icon as wallet_icon,
        t.to_wallet_id, tw.name as to_wallet_name,
        t.description, t.date, t.created_at, t.updated_at
      FROM transactions t
      LEFT JOIN categories c ON t.category_id = c.id
      LEFT JOIN wallets w ON t.wallet_id = w.id
      LEFT JOIN wallets tw ON t.to_wallet_id = tw.id
      WHERE t.user_id = $1
    `;

    const params: any[] = [session.userId];
    let paramIndex = 2;

    if (month && year) {
      sql += ` AND EXTRACT(MONTH FROM t.date) = $${paramIndex} AND EXTRACT(YEAR FROM t.date) = $${paramIndex + 1}`;
      params.push(parseInt(month, 10), parseInt(year, 10));
      paramIndex += 2;
    } else if (year) {
      sql += ` AND EXTRACT(YEAR FROM t.date) = $${paramIndex}`;
      params.push(parseInt(year, 10));
      paramIndex += 1;
    }

    if (type && ['expense', 'income', 'transfer'].includes(type)) {
      sql += ` AND t.type = $${paramIndex}`;
      params.push(type);
      paramIndex += 1;
    }

    if (walletId) {
      sql += ` AND (t.wallet_id = $${paramIndex} OR t.to_wallet_id = $${paramIndex})`;
      params.push(walletId);
      paramIndex += 1;
    }

    if (categoryId) {
      sql += ` AND t.category_id = $${paramIndex}`;
      params.push(categoryId);
      paramIndex += 1;
    }

    if (search && search.trim() !== '') {
      sql += ` AND (t.description ILIKE $${paramIndex} OR c.name ILIKE $${paramIndex})`;
      params.push(`%${search.trim()}%`);
      paramIndex += 1;
    }

    sql += ` ORDER BY t.date DESC, t.created_at DESC LIMIT $${paramIndex} OFFSET $${paramIndex + 1}`;
    params.push(limit, offset);

    const transactions = await query<Transaction>(sql, params);

    return NextResponse.json({ success: true, data: transactions });
  } catch (error: any) {
    console.error('Get transactions error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getAuthSession(req);
    if (!session) return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const validated = transactionSchema.parse(body);

    const result = await withTransaction(async (client) => {
      // 1. Fetch and lock source wallet
      const walletRows = await client.query(
        'SELECT id, name, balance FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
        [validated.wallet_id, session.userId]
      );

      if (walletRows.rows.length === 0) {
        throw new Error('Dompet asal tidak ditemukan.');
      }

      const sourceWallet = walletRows.rows[0];
      const sourceBalance = parseFloat(sourceWallet.balance);
      const totalDebit = validated.type === 'transfer' 
        ? validated.amount + (validated.admin_fee || 0)
        : validated.amount;

      // 2. Strict zero balance check for expense and transfer
      if ((validated.type === 'expense' || validated.type === 'transfer') && sourceBalance < totalDebit) {
        throw new Error(
          `Saldo ${sourceWallet.name} tidak mencukupi. (Tersedia: ${formatRupiah(sourceBalance)}, Dibutuhkan: ${formatRupiah(totalDebit)})`
        );
      }

      // 3. Update source wallet balance
      if (validated.type === 'expense') {
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [validated.amount, validated.wallet_id]
        );
      } else if (validated.type === 'income') {
        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [validated.amount, validated.wallet_id]
        );
      } else if (validated.type === 'transfer') {
        // Debit source wallet (amount + admin fee)
        await client.query(
          'UPDATE wallets SET balance = balance - $1, updated_at = NOW() WHERE id = $2',
          [totalDebit, validated.wallet_id]
        );

        // Credit destination wallet (amount)
        const toWalletRows = await client.query(
          'SELECT id, name FROM wallets WHERE id = $1 AND user_id = $2 FOR UPDATE',
          [validated.to_wallet_id, session.userId]
        );

        if (toWalletRows.rows.length === 0) {
          throw new Error('Dompet tujuan transfer tidak ditemukan.');
        }

        await client.query(
          'UPDATE wallets SET balance = balance + $1, updated_at = NOW() WHERE id = $2',
          [validated.amount, validated.to_wallet_id]
        );
      }

      // 4. Insert transaction record
      const insertedTrx = await client.query(
        `INSERT INTO transactions (
          user_id, type, amount, admin_fee, category_id, wallet_id, to_wallet_id, description, date
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
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
        ]
      );

      return insertedTrx.rows[0];
    });

    return NextResponse.json({ success: true, data: result });
  } catch (error: any) {
    if (error.name === 'ZodError') {
      return NextResponse.json({ success: false, error: error.errors[0].message }, { status: 400 });
    }
    console.error('Create transaction error:', error);
    return NextResponse.json({ success: false, error: error.message || 'Gagal menyimpan transaksi' }, { status: 400 });
  }
}
