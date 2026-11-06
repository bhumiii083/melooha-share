import { describe, it, expect } from 'vitest';
import { validate } from './validate.js';
import type { Fact } from './facts.js';
import { computeChart } from './chart.js';
import { rate } from './events.js';

const facts: Fact[] = [
    { id: 'F1', text: 'Ascendant Cancer' },
    { id: 'F7', planet: 'Saturn', text: 'Saturn in house 12' },
];

describe('validator', () => {
    it('keeps a correctly tagged sentence', () => {
        const result = validate('Saturn teaches patience [F7].', facts);
        expect(result.factIds).toEqual(['F7']);
        expect(result.grounded).toBe(true);
    });

    it('strips a fake tag', () => {
        const result = validate('Be kind to yourself [F99].', facts);
        expect(result.text).not.toContain('F99');
        expect(result.grounded).toBe(false);
    });

    it('drops a Mars sentence tagged with a Saturn fact', () => {
        const result = validate('Mars makes you bold [F7].', facts);
        expect(result.text).toBe('');
    });

    it('drops an untagged planet claim', () => {
        expect(validate('Jupiter blesses you.', facts).text).toBe('');
    });
});

describe('metrics helper', () => {
    it('returns null when the denominator is zero', () => {
        expect(rate(1, 0)).toBeNull();
    });
});

describe('chart', () => {
    it('computes 9 placements and Ketu opposite Rahu', () => {
        const chart = computeChart({
            year: 2004,
            month: 5,
            day: 14,
            hour: 10,
            minute: 30,
            lat: 21.1458,
            lon: 79.0882,
        });

        expect(chart.planets).toHaveLength(9);

        const rahu = chart.planets.find((p) => p.name === 'Rahu')!.longitude;
        const ketu = chart.planets.find((p) => p.name === 'Ketu')!.longitude;
        expect(Math.abs(((ketu - rahu + 360) % 360) - 180)).toBeLessThan(0.01);

        expect(chart.planets.find((p) => p.name === 'Sun')!.sign).toBe('Aries');
    });
});