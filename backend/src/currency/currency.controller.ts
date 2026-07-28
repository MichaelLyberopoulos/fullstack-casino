import { Controller, Get, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import { CurrencyService } from './currency.service';
import { ConvertDto } from './dto/convert.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../common/decorators/current-user.decorator';

/** Question 6 — protected: converts the authenticated user's own balance. */
@ApiTags('currency')
@ApiBearerAuth()
@Controller('currency')
export class CurrencyController {
  constructor(private readonly currencyService: CurrencyService) {}

  @Get('convert')
  @ApiOperation({ summary: "Convert the user's coin balance for display (does not modify it)" })
  convert(@CurrentUser() user: AuthenticatedUser, @Query() query: ConvertDto) {
    return this.currencyService.convertBalance(user.id, query.to);
  }
}
