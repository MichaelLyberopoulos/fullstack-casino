import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { configureApp } from '../src/app.setup';
import { PrismaService } from '../src/prisma/prisma.service';
import { RANDOM_PROVIDER, RandomProvider } from '../src/spins/slot-engine/random.provider';

/**
 * E2E tests against a REAL PostgreSQL instance (docker-compose: postgres_test).
 * Row locks and concurrent transactions behave differently on mocks/SQLite,
 * so the concurrency test in particular must run on Postgres.
 *
 * The RNG is replaced with a deterministic queue of reel indices, making
 * every spin outcome exact.
 */
class FixedRandomProvider implements RandomProvider {
  queue: number[] = [];
  nextInt(_maxExclusive: number): number {
    return this.queue.length > 0 ? this.queue.shift()! : 0;
  }
}

describe('Casino API (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let random: FixedRandomProvider;

  const credentials = {
    email: 'e2e@test.com',
    username: 'e2e_user',
    password: 'password123',
  };
  let token: string;
  let userId: number;
  let fixtureGameId: number;

  beforeAll(async () => {
    random = new FixedRandomProvider();

    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(RANDOM_PROVIDER)
      .useValue(random)
      .compile();

    app = moduleRef.createNestApplication();
    configureApp(app); // identical validation/prefix setup to production bootstrap
    await app.init();

    prisma = app.get(PrismaService);
    // Clean slate for repeatable runs (spins first: FK to games/users).
    await prisma.spinHistory.deleteMany();
    await prisma.user.deleteMany();
    await prisma.game.deleteMany({ where: { externalId: { gte: 999900 } } });

    // Fixture games: the test DB is migrated but never seeded. Titles include
    // literal LIKE metacharacters to pin down search escaping.
    const slots = await prisma.gameType.upsert({
      where: { name: 'Slots' },
      update: {},
      create: { name: 'Slots' },
    });
    const casino =
      (await prisma.casino.findFirst()) ??
      (await prisma.casino.create({ data: { name: 'E2E Casino' } }));
    const fixtures = [
      { externalId: 999901, slug: 'e2e-100-bonus', title: 'E2E 100% Bonus' },
      { externalId: 999902, slug: 'e2e-under-score', title: 'E2E under_score' },
      { externalId: 999903, slug: 'e2e-plain', title: 'E2E Plain' },
    ];
    for (const f of fixtures) {
      const game = await prisma.game.create({
        data: {
          ...f,
          providerName: 'E2E Provider',
          thumbUrl: 'https://assets-sandbox.goodvibescasino.com/e2e.webp',
          gameTypeId: slots.id,
          casinoId: casino.id,
        },
      });
      if (f.externalId === 999903) fixtureGameId = game.id;
    }
  });

  afterAll(async () => {
    await app.close();
  });

  describe('authentication (Question 3)', () => {
    it('registers a user who starts with exactly 20 coins', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/register')
        .send(credentials)
        .expect(201);

      expect(res.body.accessToken).toBeDefined();
      expect(res.body.user.balance).toBe('20.00');
      expect(res.body.user.email).toBe('e2e@test.com');
      token = res.body.accessToken;
      userId = res.body.user.id;
    });

    it('normalizes email case: duplicate registration is rejected (409)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ ...credentials, email: 'E2E@Test.com', username: 'other_name' })
        .expect(409);
    });

    it('rejects invalid registration payloads (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/register')
        .send({ email: 'not-an-email', username: 'x', password: 'short' })
        .expect(400);
    });

    it('logs in with valid credentials', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: credentials.email, password: credentials.password })
        .expect(200);
      expect(res.body.accessToken).toBeDefined();
    });

    it('rejects bad credentials (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/auth/login')
        .send({ email: credentials.email, password: 'wrong-password' })
        .expect(401);
    });

    it('protects endpoints: no token → 401', async () => {
      await request(app.getHttpServer()).post('/api/spins').send({ betAmount: 1 }).expect(401);
      await request(app.getHttpServer()).get('/api/spins').expect(401);
      await request(app.getHttpServer()).get('/api/auth/me').expect(401);
      await request(app.getHttpServer()).get('/api/currency/convert?to=USD').expect(401);
    });
  });

  describe('slot machine (Question 3)', () => {
    it('a winning spin: cherry-cherry-lemon at 1.00 pays ×40', async () => {
      // Reel indices: REELS[0][0]=cherry, REELS[1][4]=cherry, REELS[2][0]=lemon
      random.queue = [0, 4, 0];

      const res = await request(app.getHttpServer())
        .post('/api/spins')
        .set('Authorization', `Bearer ${token}`)
        .send({ betAmount: 1.0 })
        .expect(201);

      expect(res.body.reelResults).toEqual(['cherry', 'cherry', 'lemon']);
      expect(res.body.grossWinnings).toBe('40.00');
      expect(res.body.netAmount).toBe('39.00');
      expect(res.body.balance).toBe('59.00'); // 20 - 1 + 40
      expect(res.body.spinId).toBeDefined();
    });

    it('a losing spin: apple-lemon-lemon deducts the bet', async () => {
      // REELS[0][2]=apple, REELS[1][0]=lemon, REELS[2][0]=lemon → run of 1 → no win
      random.queue = [2, 0, 0];

      const res = await request(app.getHttpServer())
        .post('/api/spins')
        .set('Authorization', `Bearer ${token}`)
        .send({ betAmount: 2.5 })
        .expect(201);

      expect(res.body.reelResults).toEqual(['apple', 'lemon', 'lemon']);
      expect(res.body.grossWinnings).toBe('0.00');
      expect(res.body.netAmount).toBe('-2.50');
      expect(res.body.balance).toBe('56.50');
    });

    it('persists every spin with full audit fields', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/spins')
        .set('Authorization', `Bearer ${token}`)
        .expect(200);

      expect(res.body.total).toBe(2);
      const latest = res.body.items[0];
      expect(latest.balanceBefore).toBe('59.00');
      expect(latest.balanceAfter).toBe('56.50');
      expect(latest.reelResults).toEqual(['apple', 'lemon', 'lemon']);
    });

    it('rejects off-grid bets (400)', async () => {
      for (const betAmount of [0.75, 0.25, 5.5, -1, 0]) {
        await request(app.getHttpServer())
          .post('/api/spins')
          .set('Authorization', `Bearer ${token}`)
          .send({ betAmount })
          .expect(400);
      }
    });

    it('rejects a spin when balance is insufficient (400) and does not record it', async () => {
      await prisma.user.update({ where: { id: userId }, data: { balance: '0.40' } });

      const res = await request(app.getHttpServer())
        .post('/api/spins')
        .set('Authorization', `Bearer ${token}`)
        .send({ betAmount: 0.5 })
        .expect(400);
      expect(res.body.message).toContain('Insufficient balance');

      const count = await prisma.spinHistory.count({ where: { userId } });
      expect(count).toBe(2); // unchanged
    });

    it('CONCURRENCY: two simultaneous 5.00 bets on a 5.00 balance → exactly one succeeds', async () => {
      await prisma.user.update({ where: { id: userId }, data: { balance: '5.00' } });
      // Only the winning-of-the-race spin consumes RNG values (the loser is
      // rejected before the reels are drawn). apple-lemon-lemon → loss.
      random.queue = [2, 0, 0];
      const before = await prisma.spinHistory.count({ where: { userId } });

      const [a, b] = await Promise.all([
        request(app.getHttpServer())
          .post('/api/spins')
          .set('Authorization', `Bearer ${token}`)
          .send({ betAmount: 5.0 }),
        request(app.getHttpServer())
          .post('/api/spins')
          .set('Authorization', `Bearer ${token}`)
          .send({ betAmount: 5.0 }),
      ]);

      const statuses = [a.status, b.status].sort();
      expect(statuses).toEqual([201, 400]); // one spin, one insufficient-balance

      const user = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
      expect(user.balance.toFixed(2)).toBe('0.00'); // never negative
      expect(user.balance.isNegative()).toBe(false);

      const after = await prisma.spinHistory.count({ where: { userId } });
      expect(after).toBe(before + 1); // exactly one spin record created
    });

    it('rejects a spin with an unknown gameId (400, not a 500 FK violation)', async () => {
      const before = await prisma.spinHistory.count({ where: { userId } });

      const res = await request(app.getHttpServer())
        .post('/api/spins')
        .set('Authorization', `Bearer ${token}`)
        .send({ betAmount: 0.5, gameId: 99999999 })
        .expect(400);
      expect(JSON.stringify(res.body.message)).toContain('gameId');

      const after = await prisma.spinHistory.count({ where: { userId } });
      expect(after).toBe(before); // nothing recorded, no balance change
    });

    it('accepts a spin with a valid gameId and links the record to it', async () => {
      await prisma.user.update({ where: { id: userId }, data: { balance: '10.00' } });
      random.queue = [2, 0, 0]; // apple-lemon-lemon → loss

      const res = await request(app.getHttpServer())
        .post('/api/spins')
        .set('Authorization', `Bearer ${token}`)
        .send({ betAmount: 0.5, gameId: fixtureGameId })
        .expect(201);

      const record = await prisma.spinHistory.findUniqueOrThrow({
        where: { id: res.body.spinId },
      });
      expect(record.gameId).toBe(fixtureGameId);
    });
  });

  describe('games (Questions 1, 2, 4)', () => {
    it('games listing is public and paginated', async () => {
      const res = await request(app.getHttpServer()).get('/api/games?limit=5').expect(200);
      expect(res.body).toHaveProperty('items');
      expect(res.body).toHaveProperty('total');
      expect(res.body.items.length).toBeLessThanOrEqual(5);
    });

    it('rejects an over-cap page size (400)', async () => {
      await request(app.getHttpServer()).get('/api/games?limit=500').expect(400);
    });

    it('rejects unknown query params (400, forbidNonWhitelisted)', async () => {
      await request(app.getHttpServer()).get('/api/games?hack=1').expect(400);
    });

    it('rejects an over-long search term (400)', async () => {
      await request(app.getHttpServer())
        .get(`/api/games/search?q=${'a'.repeat(150)}`)
        .expect(400);
    });

    it('treats LIKE metacharacters literally: q=% only matches literal %', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/games/search')
        .query({ q: '%' })
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].title).toBe('E2E 100% Bonus');
    });

    it('treats _ literally: q=E2E_ matches nothing (no single-char wildcard)', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/games/search')
        .query({ q: 'E2E_' })
        .expect(200);
      // Pre-fix, _ matched the space in "E2E 100% Bonus" etc.
      expect(res.body.total).toBe(0);
    });

    it('still matches a literal underscore in titles', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/games/search')
        .query({ q: 'under_score' })
        .expect(200);
      expect(res.body.total).toBe(1);
      expect(res.body.items[0].title).toBe('E2E under_score');
    });
  });

  describe('client config (Questions 6 & 3 — shared constants)', () => {
    it('GET /api/config is public and serves currencies + bet grid', async () => {
      const res = await request(app.getHttpServer()).get('/api/config').expect(200);
      expect(res.body.currencies).toContain('USD');
      expect(res.body.bet.options).toHaveLength(10);
      expect(res.body.bet.options[0]).toBe(0.5);
      expect(res.body.bet.options[9]).toBe(5);
    });
  });

  describe('currency (Question 6)', () => {
    it('rejects a non-allowlisted currency (400)', async () => {
      await request(app.getHttpServer())
        .get('/api/currency/convert?to=BTC')
        .set('Authorization', `Bearer ${token}`)
        .expect(400);
    });
  });
});
