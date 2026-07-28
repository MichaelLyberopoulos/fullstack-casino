import { Controller, Get, Query } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { GamesService } from './games.service';
import { Public } from '../common/decorators/public.decorator';
import { PaginationDto } from '../common/dto/pagination.dto';
import { SearchGamesDto } from './dto/search-games.dto';

@ApiTags('games')
@Controller('games')
export class GamesController {
  constructor(private readonly gamesService: GamesService) {}

  /** Question 1 — full game listing served by the backend. */
  @Public()
  @Get()
  @ApiOperation({ summary: 'List all games (paginated)' })
  list(@Query() query: PaginationDto) {
    return this.gamesService.findGames(query);
  }

  /** Question 2 — dedicated backend search endpoint used by type-ahead search. */
  @Public()
  @Get('search')
  @ApiOperation({ summary: 'Search games by title or provider (paginated, cached)' })
  search(@Query() query: SearchGamesDto) {
    return this.gamesService.findGames(query);
  }
}
