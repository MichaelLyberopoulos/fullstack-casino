-- ============================================================================
-- Question 7 — Online Casino Platform: relational schema (PostgreSQL)
--
-- This file documents the design as hand-written DDL. The SAME schema is
-- applied to the live database by the Prisma migration in
-- backend/prisma/migrations/ (including these constraints and indexes).
--
-- Design notes
--  - "A casino contains multiple games"      → casino 1—N game
--  - "Each game has a unique type"           → game N—1 game_type
--  - "Games available in multiple countries" → game N—M country (game_country)
--  - "Users may have a favorite game"        → user_favorite_game with UNIQUE(user_id)
--  - "Every spin recorded permanently"       → spin_history (append-only, audited)
--  - Money is NUMERIC(12,2) — never floats.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE TABLE "User" (
    "id"           SERIAL PRIMARY KEY,
    "email"        TEXT NOT NULL,             -- stored lowercased
    "username"     TEXT NOT NULL,
    "passwordHash" TEXT NOT NULL,             -- bcrypt
    "balance"      NUMERIC(12,2) NOT NULL DEFAULT 20.00,  -- new players start with 20 coins
    "createdAt"    TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3) NOT NULL,

    CONSTRAINT "user_balance_non_negative" CHECK ("balance" >= 0)
);
CREATE UNIQUE INDEX "User_email_key"    ON "User"("email");
CREATE UNIQUE INDEX "User_username_key" ON "User"("username");

CREATE TABLE "Casino" (
    "id"        SERIAL PRIMARY KEY,
    "name"      TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "Country" (
    "id"      SERIAL PRIMARY KEY,
    "isoCode" VARCHAR(2) NOT NULL,
    "name"    TEXT NOT NULL
);
CREATE UNIQUE INDEX "Country_isoCode_key" ON "Country"("isoCode");

CREATE TABLE "GameType" (
    "id"   SERIAL PRIMARY KEY,
    "name" TEXT NOT NULL
);
CREATE UNIQUE INDEX "GameType_name_key" ON "GameType"("name");

CREATE TABLE "Game" (
    "id"           SERIAL PRIMARY KEY,
    "externalId"   INTEGER NOT NULL,          -- id from the source game-data.json
    "slug"         TEXT NOT NULL,
    "title"        TEXT NOT NULL,
    "providerName" TEXT NOT NULL,
    "thumbUrl"     TEXT NOT NULL,
    "gameTypeId"   INTEGER NOT NULL,
    "casinoId"     INTEGER NOT NULL,

    CONSTRAINT "Game_gameTypeId_fkey" FOREIGN KEY ("gameTypeId")
        REFERENCES "GameType"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Game_casinoId_fkey" FOREIGN KEY ("casinoId")
        REFERENCES "Casino"("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "Game_externalId_key" ON "Game"("externalId");
CREATE UNIQUE INDEX "Game_slug_key"       ON "Game"("slug");
CREATE INDEX "Game_gameTypeId_idx"        ON "Game"("gameTypeId");
CREATE INDEX "Game_casinoId_idx"          ON "Game"("casinoId");
-- [Question 5] Trigram indexes on the RAW columns accelerate the search
-- endpoint's case-insensitive ILIKE '%term%' matching.
CREATE INDEX "game_title_trgm_idx"    ON "Game" USING gin ("title" gin_trgm_ops);
CREATE INDEX "game_provider_trgm_idx" ON "Game" USING gin ("providerName" gin_trgm_ops);

-- M:N — game availability per country.
CREATE TABLE "GameCountry" (
    "gameId"    INTEGER NOT NULL,
    "countryId" INTEGER NOT NULL,

    CONSTRAINT "GameCountry_pkey" PRIMARY KEY ("gameId", "countryId"),
    CONSTRAINT "GameCountry_gameId_fkey" FOREIGN KEY ("gameId")
        REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "GameCountry_countryId_fkey" FOREIGN KEY ("countryId")
        REFERENCES "Country"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "GameCountry_countryId_idx" ON "GameCountry"("countryId");

-- Users may have AT MOST one favorite game (UNIQUE on user_id).
CREATE TABLE "UserFavoriteGame" (
    "id"        SERIAL PRIMARY KEY,
    "userId"    INTEGER NOT NULL,
    "gameId"    INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "UserFavoriteGame_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "UserFavoriteGame_gameId_fkey" FOREIGN KEY ("gameId")
        REFERENCES "Game"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "UserFavoriteGame_userId_key" ON "UserFavoriteGame"("userId");
CREATE INDEX "UserFavoriteGame_gameId_idx"        ON "UserFavoriteGame"("gameId");

-- Permanent, append-only spin audit log.
CREATE TABLE "SpinHistory" (
    "id"            TEXT PRIMARY KEY,          -- uuid
    "userId"        INTEGER NOT NULL,
    "gameId"        INTEGER,                   -- nullable: "Game ID (if applicable)"
    "reelResults"   TEXT[] NOT NULL,           -- e.g. {cherry,cherry,lemon}
    "betAmount"     NUMERIC(12,2) NOT NULL,
    "grossWinnings" NUMERIC(12,2) NOT NULL,
    "netAmount"     NUMERIC(12,2) NOT NULL,    -- amount won/lost = gross - bet
    "balanceBefore" NUMERIC(12,2) NOT NULL,
    "balanceAfter"  NUMERIC(12,2) NOT NULL,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SpinHistory_userId_fkey" FOREIGN KEY ("userId")
        REFERENCES "User"("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "SpinHistory_gameId_fkey" FOREIGN KEY ("gameId")
        REFERENCES "Game"("id") ON DELETE SET NULL ON UPDATE CASCADE,

    -- Data-integrity guarantees, enforced by the database itself:
    CONSTRAINT "spin_bet_range"            CHECK ("betAmount" >= 0.50 AND "betAmount" <= 5.00),
    CONSTRAINT "spin_bet_step"             CHECK (mod("betAmount", 0.50) = 0),
    CONSTRAINT "spin_gross_non_negative"   CHECK ("grossWinnings" >= 0),
    CONSTRAINT "spin_net_consistent"       CHECK ("netAmount" = "grossWinnings" - "betAmount"),
    CONSTRAINT "spin_balance_consistent"   CHECK ("balanceAfter" = "balanceBefore" + "netAmount"),
    CONSTRAINT "spin_balance_after_non_negative" CHECK ("balanceAfter" >= 0)
);
CREATE INDEX "SpinHistory_userId_createdAt_idx" ON "SpinHistory"("userId", "createdAt");
CREATE INDEX "SpinHistory_gameId_idx"           ON "SpinHistory"("gameId");
