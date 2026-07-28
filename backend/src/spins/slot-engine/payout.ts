import { Prisma } from '@prisma/client';

const Decimal = Prisma.Decimal;
type Decimal = Prisma.Decimal;

/**
 * Question 3 — winning logic.
 *
 * A match is only valid when symbols appear CONSECUTIVELY from left to right,
 * starting with Reel 1. Only the highest applicable payout is awarded
 * (a 3-match multiplier is always higher than the same symbol's 2-match,
 * so evaluating the leading run once yields exactly that highest payout).
 *
 * Multipliers (× spin cost):
 *   cherry: 3-in-a-row 50, 2-in-a-row 40
 *   apple:  3-in-a-row 20, 2-in-a-row 10
 *   banana: 3-in-a-row 15, 2-in-a-row  5
 *   lemon:  3-in-a-row  3, 2-in-a-row  0 (no payout)
 */
const MULTIPLIERS: Record<string, { three: number; two: number }> = {
  cherry: { three: 50, two: 40 },
  apple: { three: 20, two: 10 },
  banana: { three: 15, two: 5 },
  lemon: { three: 3, two: 0 },
};

export interface PayoutResult {
  /** Multiplier applied to the bet (0 = loss). */
  multiplier: number;
  /** Gross winnings = bet × multiplier, as an exact Decimal. */
  grossWinnings: Decimal;
}

/**
 * Pure function: computes winnings for a spin result.
 * All money math uses Prisma.Decimal — never JS floats.
 */
export function calculatePayout(reels: string[], betAmount: Decimal): PayoutResult {
  const [first, second, third] = reels;

  // Length of the consecutive run starting at Reel 1.
  let run = 1;
  if (first === second) {
    run = second === third ? 3 : 2;
  }

  const table = MULTIPLIERS[first] ?? { three: 0, two: 0 };
  const multiplier = run === 3 ? table.three : run === 2 ? table.two : 0;

  return {
    multiplier,
    grossWinnings: betAmount.mul(multiplier),
  };
}
