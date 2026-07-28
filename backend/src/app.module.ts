import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { CacheModule } from '@nestjs/cache-manager';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { GamesModule } from './games/games.module';
import { SpinsModule } from './spins/spins.module';
import { CurrencyModule } from './currency/currency.module';
import { ClientConfigModule } from './client-config/client-config.module';
import { JwtAuthGuard } from './auth/jwt-auth.guard';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // [Question 4 — Security] Global rate limiting: 100 requests/min per IP.
    // Sensitive routes (auth, spins) declare stricter limits via @Throttle.
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    // [Question 5 — Optimization] In-memory cache used by games search + FX rates.
    CacheModule.register({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    GamesModule,
    SpinsModule,
    CurrencyModule,
    ClientConfigModule,
  ],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // [Question 3/4] Every route requires a JWT unless marked @Public().
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_FILTER, useClass: AllExceptionsFilter },
    { provide: APP_INTERCEPTOR, useClass: LoggingInterceptor },
  ],
})
export class AppModule {}
