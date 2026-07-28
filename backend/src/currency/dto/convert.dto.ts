import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsIn } from 'class-validator';

/**
 * [Question 6] Supported display currencies (allowlist — anything else is a 400).
 * Base currency is EUR: 1 casino coin is treated as 1 EUR for display purposes.
 */
export const SUPPORTED_CURRENCIES = [
  'USD',
  'GBP',
  'CHF',
  'JPY',
  'CAD',
  'AUD',
  'SEK',
  'NOK',
  'DKK',
  'PLN',
] as const;

export class ConvertDto {
  @ApiProperty({ enum: SUPPORTED_CURRENCIES, example: 'USD' })
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toUpperCase() : value))
  @IsIn(SUPPORTED_CURRENCIES as unknown as string[])
  to!: string;
}
