import { Injectable } from '@nestjs/common';
import { randomInt } from 'crypto';

/**
 * [Question 3] Randomness source for spins: production uses crypto.randomInt
 * (unbiased CSPRNG); tests inject predetermined reel positions.
 */
export const RANDOM_PROVIDER = Symbol('RANDOM_PROVIDER');

export interface RandomProvider {
  /** Returns a uniform integer in [0, maxExclusive). */
  nextInt(maxExclusive: number): number;
}

@Injectable()
export class CryptoRandomProvider implements RandomProvider {
  nextInt(maxExclusive: number): number {
    return randomInt(maxExclusive);
  }
}
