import { Body, Controller, Get, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { SpinsService } from './spins.service';
import { CreateSpinDto } from './dto/create-spin.dto';
import { PaginationDto } from '../common/dto/pagination.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/**
 * Question 3 — slot machine endpoints.
 * No @Public() here: the global JwtAuthGuard protects every route,
 * so spins are only possible with a valid JWT.
 */
@ApiTags('spins')
@ApiBearerAuth()
@Controller('spins')
export class SpinsController {
  constructor(private readonly spinsService: SpinsService) {}

  // [Question 4 — Security] Per-user spin rate is bounded; a stuck client or
  // script cannot hammer the wallet path.
  @Throttle({ default: { limit: 30, ttl: 60_000 } })
  @Post()
  @ApiOperation({ summary: 'Play one spin (deducts bet, persists result, returns outcome)' })
  spin(@CurrentUser() user: AuthenticatedUser, @Body() dto: CreateSpinDto) {
    return this.spinsService.spin(user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: "The authenticated user's spin history (paginated)" })
  history(@CurrentUser() user: AuthenticatedUser, @Query() query: PaginationDto) {
    return this.spinsService.history(user.id, query);
  }
}
