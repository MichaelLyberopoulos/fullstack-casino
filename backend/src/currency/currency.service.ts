import { CACHE_MANAGER } from '@nestjs/cache-manager';
import {
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';

const Decimal = Prisma.Decimal;

/**
 * Question 6 — currency conversion for DISPLAY ONLY.
 *
 * Assumption (documented in the README): 1 casino coin = 1 EUR.
 * The stored balance is a coin amount and is never modified here.
 *
 * Rates come from the free Frankfurter API (ECB data, no API key) and are
 * cached server-side for 1 hour, so at most one upstream call per currency
 * per hour regardless of user traffic.
 */
const BASE_CURRENCY = 'EUR';
const RATES_TTL_MS = 60 * 60 * 1000; // 1 hour
const UPSTREAM_TIMEOUT_MS = 5_000;

@Injectable()
export class CurrencyService {
  private readonly logger = new Logger(CurrencyService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  async convertBalance(userId: number, target: string) {
    const [user, rate] = await Promise.all([
      this.prisma.user.findUnique({ where: { id: userId }, select: { balance: true } }),
      this.getRate(target),
    ]);
    if (!user) throw new NotFoundException('User not found');

    const coinBalance = new Decimal(user.balance);
    const convertedBalance = coinBalance.mul(rate).toDecimalPlaces(2);

    return {
      coinBalance: coinBalance.toFixed(2),
      baseCurrency: BASE_CURRENCY,
      targetCurrency: target,
      rate: rate.toString(),
      convertedBalance: convertedBalance.toFixed(2),
    };
  }

  private async getRate(target: string): Promise<Prisma.Decimal> {
    const cacheKey = `fx:${BASE_CURRENCY}:${target}`;
    const cached = await this.cache.get<string>(cacheKey);
    if (cached) return new Decimal(cached);

    let rate: number | undefined;
    try {
      const res = await fetch(
        `https://api.frankfurter.dev/v1/latest?base=${BASE_CURRENCY}&symbols=${target}`,
        { signal: AbortSignal.timeout(UPSTREAM_TIMEOUT_MS) },
      );
      if (!res.ok) throw new Error(`upstream responded ${res.status}`);
      const body = (await res.json()) as { rates?: Record<string, number> };
      rate = body.rates?.[target];
    } catch (e) {
      this.logger.warn(`Exchange-rate fetch failed for ${target}: ${(e as Error).message}`);
    }

    if (typeof rate !== 'number' || !Number.isFinite(rate) || rate <= 0) {
      // Question 6: graceful failure — the stored balance is never affected.
      throw new ServiceUnavailableException(
        'Exchange-rate service is currently unavailable. Please try again later.',
      );
    }

    await this.cache.set(cacheKey, String(rate), RATES_TTL_MS);
    return new Decimal(String(rate));
  }
}
