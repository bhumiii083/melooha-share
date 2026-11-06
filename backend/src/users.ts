import type { PoolClient } from 'pg';
import { pool, query } from './db.js';

async function withTx<T>(fn: (c: PoolClient) => Promise<T>): Promise<T> {
    const c = await pool.connect();
    try {
        await c.query('BEGIN');
        const result = await fn(c);
        await c.query('COMMIT');
        return result;
    } catch (e) {
        await c.query('ROLLBACK');
        throw e;
    } finally {
        c.release();
    }
}

export async function createGuest(ref?: string) {
    const r = await query(
        'INSERT INTO users(referred_by) VALUES ($1) RETURNING id, balance',
        [ref ?? null]
    );
    return r.rows[0];
}

export const getBalance = async (userId: string): Promise<number | null> => {
    const r = await query('SELECT balance FROM users WHERE id = $1', [userId]);
    return r.rows[0]?.balance ?? null;
};

export const spendOne = (userId: string) =>
    withTx(async (c) => {
        const r = await c.query(
            'UPDATE users SET balance = balance - 1 WHERE id = $1 AND balance > 0 RETURNING balance',
            [userId]
        );
        if (r.rowCount === 0) return false;
        await c.query('INSERT INTO ledger(user_id, delta, reason) VALUES ($1, -1, $2)', [userId, 'question']);
        return true;
    });

export const addBalance = (userId: string, n: number, reason: string) =>
    withTx(async (c) => {
        const r = await c.query(
            'UPDATE users SET balance = balance + $2 WHERE id = $1 RETURNING balance',
            [userId, n]
        );
        await c.query('INSERT INTO ledger(user_id, delta, reason) VALUES ($1, $2, $3)', [userId, n, reason]);
        return r.rows[0].balance as number;
    });