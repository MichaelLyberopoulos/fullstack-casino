import { NestFactory } from '@nestjs/core';
import { Logger } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // [Question 4 — Security] Standard security response headers.
  app.use(helmet());

  // [Question 4 — Security] CORS allowlist: only the configured frontend origin(s).
  const origins = (process.env.CORS_ORIGIN ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean);
  app.enableCors({ origin: origins });

  configureApp(app);

  const swaggerConfig = new DocumentBuilder()
    .setTitle('Casino API')
    .setDescription('Full-Stack Developer Test — games, auth, slot machine, currency')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));

  const port = Number(process.env.PORT ?? 4000);
  await app.listen(port);
  new Logger('Bootstrap').log(`API listening on http://localhost:${port}/api (docs at /api/docs)`);
}

void bootstrap();
