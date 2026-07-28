import { Prisma } from '@prisma/client';
import { calculatePayout } from './payout';
import { REELS } from './reels';

const D = (v: string | number) => new Prisma.Decimal(v);

describe('calculatePayout', () => {
  const bet = D('1.00');

  // Every example given in the assignment PDF:
  it('Apple, Cherry, Apple → no win', () => {
    const r = calculatePayout(['apple', 'cherry', 'apple'], bet);
    expect(r.multiplier).toBe(0);
    expect(r.grossWinnings.toFixed(2)).toBe('0.00');
  });

  it('Apple, Apple, Cherry → win (2 apples, ×10)', () => {
    const r = calculatePayout(['apple', 'apple', 'cherry'], bet);
    expect(r.multiplier).toBe(10);
    expect(r.grossWinnings.toFixed(2)).toBe('10.00');
  });

  it('Cherry, Cherry, Lemon → win (2 cherries, ×40)', () => {
    const r = calculatePayout(['cherry', 'cherry', 'lemon'], bet);
    expect(r.multiplier).toBe(40);
    expect(r.grossWinnings.toFixed(2)).toBe('40.00');
  });

  it('Banana, Banana, Banana → win (3 bananas, ×15)', () => {
    const r = calculatePayout(['banana', 'banana', 'banana'], bet);
    expect(r.multiplier).toBe(15);
  });

  it('Lemon, Lemon, Lemon → win (3 lemons, ×3)', () => {
    const r = calculatePayout(['lemon', 'lemon', 'lemon'], bet);
    expect(r.multiplier).toBe(3);
  });

  it('Lemon, Lemon, Apple → no win (2 lemons pay nothing)', () => {
    const r = calculatePayout(['lemon', 'lemon', 'apple'], bet);
    expect(r.multiplier).toBe(0);
    expect(r.grossWinnings.toFixed(2)).toBe('0.00');
  });

  // Full payout table
  it.each([
    [['cherry', 'cherry', 'cherry'], 50],
    [['cherry', 'cherry', 'apple'], 40],
    [['apple', 'apple', 'apple'], 20],
    [['apple', 'apple', 'lemon'], 10],
    [['banana', 'banana', 'lemon'], 5],
  ])('%j → ×%i', (reels, multiplier) => {
    expect(calculatePayout(reels as string[], bet).multiplier).toBe(multiplier);
  });

  it('only counts runs starting at reel 1 (match on reels 2+3 pays nothing)', () => {
    expect(calculatePayout(['banana', 'cherry', 'cherry'], bet).multiplier).toBe(0);
    expect(calculatePayout(['lemon', 'apple', 'apple'], bet).multiplier).toBe(0);
  });

  it('scales winnings by the bet with exact decimal math', () => {
    const r = calculatePayout(['cherry', 'cherry', 'lemon'], D('2.50'));
    expect(r.grossWinnings.toFixed(2)).toBe('100.00'); // 2.50 × 40
    const r2 = calculatePayout(['banana', 'banana', 'apple'], D('0.50'));
    expect(r2.grossWinnings.toFixed(2)).toBe('2.50'); // 0.50 × 5
  });

  it('awards only the single highest payout (never cumulative)', () => {
    // 3 cherries must pay ×50, not ×50 + ×40.
    const r = calculatePayout(['cherry', 'cherry', 'cherry'], D('5.00'));
    expect(r.grossWinnings.toFixed(2)).toBe('250.00');
  });

  it('every REELS symbol is covered by the payout table', () => {
    const known = new Set(['cherry', 'lemon', 'apple', 'banana']);
    for (const reel of REELS) for (const s of reel) expect(known.has(s)).toBe(true);
  });
});
