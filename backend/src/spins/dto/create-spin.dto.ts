import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsInt,
  IsNumber,
  IsOptional,
  IsPositive,
  Max,
  Min,
  Validate,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

/** Question 3: bets range from 0.50 to 5.00 coins in 0.50 increments. */
export const BET_MIN = 0.5;
export const BET_MAX = 5.0;
export const BET_STEP = 0.5;

/** Question 3: bets must land exactly on the 0.50-coin grid. */
@ValidatorConstraint({ name: 'isHalfCoinStep' })
class IsHalfCoinStep implements ValidatorConstraintInterface {
  validate(value: number) {
    return typeof value === 'number' && Number.isInteger(value * 2);
  }
  defaultMessage() {
    return 'betAmount must be in increments of 0.50 coins';
  }
}

export class CreateSpinDto {
  @ApiProperty({ example: 1.5, description: '0.50–5.00 coins, in 0.50 steps' })
  @Type(() => Number)
  @IsNumber({ maxDecimalPlaces: 2 })
  @Min(BET_MIN)
  @Max(BET_MAX)
  @Validate(IsHalfCoinStep)
  betAmount!: number;

  @ApiPropertyOptional({ description: 'Optional game the spin belongs to (internal game id)' })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @IsPositive()
  gameId?: number;
}
