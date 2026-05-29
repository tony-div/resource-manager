import mysql, { Pool, PoolConnection } from 'mysql2/promise';
import { env } from './env';

let pool: Pool;

export function getPool(): Pool {
  if (!pool) {
    pool = mysql.createPool({
      host: env.DB_HOST,
      port: env.DB_PORT,
      user: env.DB_USER,
      password: env.DB_PASSWORD,
      database: env.DB_NAME,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: 'utf8mb4',
    });
  }
  return pool;
}

export async function getConnection(): Promise<PoolConnection> {
  return getPool().getConnection();
}

export async function executeQuery<T = any>(
  sql: string,
  params?: any[]
): Promise<T> {
  const [rows] = await getPool().execute(sql, params);
  return rows as T;
}

export async function testConnection(): Promise<boolean> {
  try {
    const conn = await getConnection();
    conn.release();
    return true;
  } catch (error) {
    console.error('Database connection failed:', error);
    return false;
  }
}
