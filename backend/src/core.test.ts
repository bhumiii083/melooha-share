import { afterAll, describe, expect, it } from 'vitest';
import { pool, query } from './db.js';
import { createGuest, getBalance, spendOne } from './users.js';
import { validate } from './validate.js';
import type { Fact } from './facts.js';
import { rate } from './events.js';

afterAll(async () => {
    await pool.end();
});

describe('answer validation', () => {
    it('strips a fake F99 tag', () => {
        const result = validate('A general note [F99].', []);

        expect(result.text).not.toContain('[F99]');
        expect(result.grounded).toBe(false);
    });

    it('drops a Mars sentence tagged with a Saturn fact', () => {
        const facts: Fact[] = [
            { id: 'F1', planet: 'Saturn', text: 'Saturn is in house 1.' },
        ];

        const result = validate('Mars is in Gemini [F1].', facts);

        expect(result.text).toBe('');
        expect(result.grounded).toBe(false);
    });
});

describe('metrics helper', () => {
    it('returns null when the denominator is zero', () => {
        expect(rate(1, 0)).toBeNull();
    });
});

describe('question balance', () => {
    it('does not let two simultaneous spends take balance below zero', async () => {
        const user = await createGuest();

        try {
            const results = await Promise.all([
                spendOne(user.id),
                spendOne(user.id),
            ]);

            expect(results.filter(Boolean)).toHaveLength(1);
            expect(await getBalance(user.id)).toBe(0);
        } finally {
            await query('DELETE FROM ledger WHERE user_id = $1', [user.id]);
            await query('DELETE FROM users WHERE id = $1', [user.id]);
        }
    });
}, 30_000);