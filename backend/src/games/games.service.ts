import { CACHE_MANAGER } from '@nestjs/cache-manager';
import { Inject, Injectable } from '@nestjs/common';
import type { Cache } from 'cache-manager';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { paginate } from '../common/pagination.util';
import { SearchGamesDto } from './dto/search-games.dto';

const GAME_SELECT = {
  id: true,
  externalId: true,
  slug: true,
  title: true,
  providerName: true,
  thumbUrl: true,
} satisfies Prisma.GameSelect;

/** [Question 5 — Optimization] Cache TTL for game/search queries. */
const CACHE_TTL_MS = 30_000;

/**
 * [Question 2 — Search] Escape ILIKE metacharacters so user input matches
 * literally — otherwise q=% matches every row and _ acts as a single-char
 * wildcard. Postgres's default LIKE escape character is backslash.
 */
const escapeLike = (s: string) => s.replace(/[\\%_]/g, '\\$&');

@Injectable()
export class GamesService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(CACHE_MANAGER) private readonly cache: Cache,
  ) {}

  /**
   * [Question 1] Paginated game listing.
   * [Question 2/5] The same code path powers search: `q` filters on title OR
   * provider name, case-insensitively (Prisma emits ILIKE, accelerated by the
   * GIN trigram indexes created in the migration). LIKE metacharacters in the
   * query are escaped, so "%"/"_" match literally.
   *
   * [Question 5 — Optimization] Results are cached with a key of
   * normalized(query) + page + limit, so repeated keystrokes/pages hit memory
   * instead of Postgres.
   */
  async findGames({ q, page, limit }: SearchGamesDto) {
    const term = q?.trim() ?? '';
    const cacheKey = `games:${term.toLowerCase()}:${page}:${limit}`;

    const cached = await this.cache.get(cacheKey);
    if (cached) return cached;

    const pattern = escapeLike(term);
    const where: Prisma.GameWhereInput = term
      ? {
          OR: [
            { title: { contains: pattern, mode: 'insensitive' } },
            { providerName: { contains: pattern, mode: 'insensitive' } },
          ],
        }
      : {};

    const [items, total] = await this.prisma.$transaction([
      this.prisma.game.findMany({
        where,
        select: GAME_SELECT,
        orderBy: { title: 'asc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.game.count({ where }),
    ]);

    const result = paginate(items, total, page, limit);
    await this.cache.set(cacheKey, result, CACHE_TTL_MS);
    return result;
  }
}
