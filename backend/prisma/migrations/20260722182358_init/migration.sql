-- CreateTable
CREATE TABLE "User" (
    "id" SERIAL NOT NULL,
    "email" TEXT NOT NULL,
    "username" TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,
    "balance" DECIMAL(12,2) NOT NULL DEFAULT 20.00,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Casino" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Casino_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Country" (
    "id" SERIAL NOT NULL,
    "isoCode" VARCHAR(2) NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Country_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameType" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameType_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Game" (
    "id" SERIAL NOT NULL,
    "externalId" INTEGER NOT NULL,
    "slug" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "thumbUrl" TEXT NOT NULL,
    "gameTypeId" INTEGER NOT NULL,
    "casinoId" INTEGER NOT NULL,

    CONSTRAINT "Game_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GameCountry" (
    "gameId" INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "GameCountry_pkey" PRIMARY KEY ("gameId","countryId")
);

-- CreateTable
CREATE TABLE "UserFavoriteGame" (
    "id" SERIAL NOT NULL,
    "userId" INTEGER NOT NULL,
    "gameId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteGame_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SpinHistory" (
    "id" TEXT NOT NULL,
    "userId" INTEGER NOT NULL,
    "gameId" INTEGER,
    "reelResults" TEXT[],
    "betAmount" DECIMAL(12,2) NOT NULL,
    "grossWinnings" DECIMAL(12,2) NOT NULL,
    "netAmount" DECIMAL(12,2) NOT NULL,
    "balanceBefore" DECIMAL(12,2) NOT NULL,
    "balanceAfter" DECIMAL(12,2) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinHistory_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

-- CreateIndex
CREATE UNIQUE INDEX "GameType_name_key" ON "GameType"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Game_externalId_key" ON "Game"("externalId");

-- CreateIndex
CREATE UNIQUE INDEX "Game_slug_key" ON "Game"("slug");

-- CreateIndex
CREATE INDEX "Game_gameTypeId_idx" ON "Game"("gameTypeId");

-- CreateIndex
CREATE INDEX "Game_casinoId_idx" ON "Game"("casinoId");

-- CreateIndex
CREATE INDEX "GameCountry_countryId_idx" ON "GameCountry"("countryId");

-- CreateIndex
CREATE UNIQUE INDEX "UserFavoriteGame_userId_key" ON "UserFavoriteGame"("userId");

-- CreateIndex
CREATE INDEX "UserFavoriteGame_gameId_idx" ON "UserFavoriteGame"("gameId");

-- CreateIndex
CREATE INDEX "SpinHistory_userId_createdAt_idx" ON "SpinHistory"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "SpinHistory_gameId_idx" ON "SpinHistory"("gameId");

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_gameTypeId_fkey" FOREIGN KEY ("gameTypeId") REFERENCES "GameType"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Game" ADD CONSTRAINT "Game_casinoId_fkey" FOREIGN KEY ("casinoId") REFERENCES "Casino"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCountry" ADD CONSTRAINT "GameCountry_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GameCountry" ADD CONSTRAINT "GameCountry_countryId_fkey" FOREIGN KEY ("countryId") REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteGame" ADD CONSTRAINT "UserFavoriteGame_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "UserFavoriteGame" ADD CONSTRAINT "UserFavoriteGame_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinHistory" ADD CONSTRAINT "SpinHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SpinHistory" ADD CONSTRAINT "SpinHistory_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- ============================================================================
-- Custom raw SQL (Question 4/5/7): search indexes + data-integrity constraints
-- ============================================================================

-- Trigram extension for fast ILIKE '%term%' searches (Question 5).
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- GIN trigram indexes on the RAW columns: Prisma's `mode: 'insensitive'`
-- generates ILIKE against the column itself, which these indexes accelerate.
CREATE INDEX "game_title_trgm_idx" ON "Game" USING gin ("title" gin_trgm_ops);
CREATE INDEX "game_provider_trgm_idx" ON "Game" USING gin ("providerName" gin_trgm_ops);

-- Data-integrity CHECK constraints (Question 7).
-- A balance can never go negative.
ALTER TABLE "User"
  ADD CONSTRAINT "user_balance_non_negative" CHECK ("balance" >= 0);

-- Bets are 0.50–5.00 coins in 0.50 increments.
ALTER TABLE "SpinHistory"
  ADD CONSTRAINT "spin_bet_range" CHECK ("betAmount" >= 0.50 AND "betAmount" <= 5.00),
  ADD CONSTRAINT "spin_bet_step" CHECK (mod("betAmount", 0.50) = 0),
  ADD CONSTRAINT "spin_gross_non_negative" CHECK ("grossWinnings" >= 0),
  -- net = gross - bet, and the balance transition must be internally consistent.
  ADD CONSTRAINT "spin_net_consistent" CHECK ("netAmount" = "grossWinnings" - "betAmount"),
  ADD CONSTRAINT "spin_balance_consistent" CHECK ("balanceAfter" = "balanceBefore" + "netAmount"),
  ADD CONSTRAINT "spin_balance_after_non_negative" CHECK ("balanceAfter" >= 0);
