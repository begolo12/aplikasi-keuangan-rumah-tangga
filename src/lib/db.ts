import { Pool, neonConfig } from '@neondatabase/serverless';

// Cache the pool across hot reloads in development
let pool: Pool | null = null;

export function getDbPool(): Pool {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) {
      throw new Error('DATABASE_URL environment variable is not defined.');
    }
    pool = new Pool({
      connectionString,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });
  }
  return pool;
}

/**
 * Execute a SQL query with parameters using the Neon connection pool.
 */
export async function query<T = any>(text: string, params: any[] = []): Promise<T[]> {
  const p = getDbPool();
  const client = await p.connect();
  try {
    const result = await client.query(text, params);
    return result.rows as T[];
  } finally {
    client.release();
  }
}

/**
 * Run a transaction callback with automatic BEGIN, COMMIT, and ROLLBACK.
 */
export async function withTransaction<T>(
  callback: (client: { query: (text: string, params?: any[]) => Promise<any> }) => Promise<T>
): Promise<T> {
  const p = getDbPool();
  const client = await p.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
