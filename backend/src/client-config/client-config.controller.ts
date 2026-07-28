import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { SUPPORTED_CURRENCIES } from '../currency/dto/convert.dto';
import { BET_MAX, BET_MIN, BET_STEP } from '../spins/dto/create-spin.dto';

/**
 * Static client configuration: the Question 3 bet grid and Question 6 currency
 * allowlist, served from the same constants that back request validation.
 */
@ApiTags('config')
@Controller('config')
export class ClientConfigController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'Static client configuration (currencies, bet grid)' })
  getConfig() {
    return {
      currencies: SUPPORTED_CURRENCIES,
      bet: {
        min: BET_MIN,
        max: BET_MAX,
        step: BET_STEP,
        options: Array.from(
          { length: Math.round((BET_MAX - BET_MIN) / BET_STEP) + 1 },
          (_, i) => BET_MIN + i * BET_STEP,
        ),
      },
    };
  }
}
