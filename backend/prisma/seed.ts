/**
 * Idempotent database seed — safe to run repeatedly; re-runs update changed
 * game data. Seeds the Question 1 game catalog and the Question 7 entities:
 *  - 1 demo casino ("a casino contains multiple games")
 *  - game types (every game in game-data.json is a slot)
 *  - a handful of countries + game availability rows (games ↔ countries M:N)
 *  - all 78 games from game-data.json, preserving their original ids as externalId
 */
import { Country, PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

interface RawGame {
  id: number;
  slug: string;
  title: string;
  providerName: string;
  thumb: { url: string };
}

async function main() {
  const raw: RawGame[] = JSON.parse(
    fs.readFileSync(path.join(__dirname, 'seed-data', 'game-data.json'), 'utf8'),
  );

  let casino = await prisma.casino.findFirst({ where: { name: 'Good Vibes Casino' } });
  if (!casino) {
    casino = await prisma.casino.create({ data: { name: 'Good Vibes Casino' } });
  }

  const slotsType = await prisma.gameType.upsert({
    where: { name: 'Slots' },
    update: {},
    create: { name: 'Slots' },
  });
  // Question 7: extra game types to demonstrate the entity.
  for (const name of ['Table Games', 'Live Casino']) {
    await prisma.gameType.upsert({ where: { name }, update: {}, create: { name } });
  }

  const countries = [
    { isoCode: 'GR', name: 'Greece' },
    { isoCode: 'DE', name: 'Germany' },
    { isoCode: 'GB', name: 'United Kingdom' },
    { isoCode: 'CA', name: 'Canada' },
  ];
  const countryRows: Country[] = [];
  for (const c of countries) {
    countryRows.push(
      await prisma.country.upsert({ where: { isoCode: c.isoCode }, update: {}, create: c }),
    );
  }

  await prisma.$transaction(
    raw.map((g) =>
      prisma.game.upsert({
        where: { externalId: g.id },
        update: {
          slug: g.slug,
          title: g.title,
          providerName: g.providerName,
          thumbUrl: g.thumb.url,
        },
        create: {
          externalId: g.id,
          slug: g.slug,
          title: g.title,
          providerName: g.providerName,
          thumbUrl: g.thumb.url,
          gameTypeId: slotsType.id,
          casinoId: casino.id,
        },
      }),
    ),
  );

  // Question 7: games can be available in multiple countries (M:N table).
  const gameIds = await prisma.game.findMany({ select: { id: true } });
  await prisma.gameCountry.createMany({
    data: gameIds.flatMap(({ id }) =>
      countryRows.map((country) => ({ gameId: id, countryId: country.id })),
    ),
    skipDuplicates: true,
  });

  const gameCount = await prisma.game.count();
  console.log(`Seed complete: ${gameCount} games in casino "${casino.name}".`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
