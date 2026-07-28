import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { PaginationDto } from '../common/dto/pagination.dto';
import { paginate } from '../common/pagination.util';
import type { SpinHistory } from '@prisma/client';
import { CreateSpinDto } from './dto/create-spin.dto';
import { calculatePayout } from './slot-engine/payout';
import { REELS } from './slot-engine/reels';
import { RANDOM_PROVIDER } from './slot-engine/random.provider';
import type { RandomProvider } from './slot-engine/random.provider';

const Decimal = Prisma.Decimal;

@Injectable()
export class SpinsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(RANDOM_PROVIDER) private readonly random: RandomProvider,
  ) {}

  /**
   * Question 3 — execute one spin atomically.
   *
   * Concurrency safety: the user row is locked with SELECT ... FOR UPDATE
   * inside the transaction, so two simultaneous spins serialize; the balance
   * check happens on the locked row and can never be bypassed. The database
   * additionally enforces balance >= 0 via a CHECK constraint (Question 7).
   */
  async spin(userId: number, dto: CreateSpinDto) {
    const bet = new Decimal(dto.betAmount.toFixed(2));

    return this.prisma.$transaction(async (tx) => {
      const rows = await tx.$queryRaw<{ id: number; balance: Prisma.Decimal }[]>`
        SELECT "id", "balance" FROM "User" WHERE "id" = ${userId} FOR UPDATE
      `;
      const user = rows[0];
      if (!user) throw new NotFoundException('User not found');

      if (dto.gameId != null) {
        const game = await tx.game.findUnique({
          where: { id: dto.gameId },
          select: { id: true },
        });
        if (!game) throw new BadRequestException(`Unknown gameId ${dto.gameId}`);
      }

      const balanceBefore = new Decimal(user.balance);
      if (balanceBefore.lessThan(bet)) {
        throw new BadRequestException('Insufficient balance for this spin');
      }

      // Question 3: randomly select one symbol from each reel.
      const reelResults = REELS.map((reel) => reel[this.random.nextInt(reel.length)]);

      const { grossWinnings } = calculatePayout(reelResults, bet);
      const netAmount = grossWinnings.minus(bet);
      // New Balance = Previous Balance − Spin Amount + Winnings
      const balanceAfter = balanceBefore.plus(netAmount);

      await tx.user.update({
        where: { id: userId },
        data: { balance: balanceAfter },
      });

      const record = await tx.spinHistory.create({
        data: {
          userId,
          gameId: dto.gameId ?? null,
          reelResults,
          betAmount: bet,
          grossWinnings,
          netAmount,
          balanceBefore,
          balanceAfter,
        },
      });

      // API response required by the spec: reels, win/loss, new balance, spin id.
      return { ...this.serializeSpin(record), balance: balanceAfter.toFixed(2) };
    });
  }

  private serializeSpin(s: SpinHistory) {
    return {
      spinId: s.id,
      reelResults: s.reelResults,
      betAmount: s.betAmount.toFixed(2),
      grossWinnings: s.grossWinnings.toFixed(2),
      netAmount: s.netAmount.toFixed(2),
      createdAt: s.createdAt,
    };
  }

  async history(userId: number, { page, limit }: PaginationDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.spinHistory.findMany({
        where: { userId },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      this.prisma.spinHistory.count({ where: { userId } }),
    ]);

    return paginate(
      items.map((s) => ({
        ...this.serializeSpin(s),
        balanceBefore: s.balanceBefore.toFixed(2),
        balanceAfter: s.balanceAfter.toFixed(2),
      })),
      total,
      page,
      limit,
    );
  }
}
