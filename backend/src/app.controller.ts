import { Controller, Get } from '@nestjs/common';
import { ApiOperation, ApiTags } from '@nestjs/swagger';
import { Public } from './common/decorators/public.decorator';

/** Friendly landing/health endpoint at the API root. */
@ApiTags('health')
@Controller()
export class AppController {
  @Public()
  @Get()
  @ApiOperation({ summary: 'API health / entry point' })
  root() {
    return {
      status: 'ok',
      name: 'Casino API',
      docs: '/api/docs',
      endpoints: ['/api/games', '/api/games/search?q=', '/api/config'],
    };
  }
}
