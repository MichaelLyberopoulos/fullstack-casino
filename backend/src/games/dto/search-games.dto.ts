import { ApiPropertyOptional } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { PaginationDto } from '../../common/dto/pagination.dto';

/**
 * [Question 2/5 — Search] Query params for the dedicated search endpoint.
 * The term is trimmed, and excessively long strings are rejected outright
 * (they cannot match anything and only waste index scans).
 */
export class SearchGamesDto extends PaginationDto {
  @ApiPropertyOptional({ description: 'Search term matched against title and provider name' })
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;
}
