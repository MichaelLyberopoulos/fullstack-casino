import { Module } from '@nestjs/common';
import { SpinsController } from './spins.controller';
import { SpinsService } from './spins.service';
import { CryptoRandomProvider, RANDOM_PROVIDER } from './slot-engine/random.provider';

@Module({
  controllers: [SpinsController],
  providers: [
    SpinsService,
    // Question 3: injectable RNG — CSPRNG in production, deterministic in tests.
    { provide: RANDOM_PROVIDER, useClass: CryptoRandomProvider },
  ],
})
export class SpinsModule {}
