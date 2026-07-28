import {
  CallHandler,
  ExecutionContext,
  Injectable,
  Logger,
  NestInterceptor,
} from '@nestjs/common';
import { Observable, tap } from 'rxjs';
import { Request, Response } from 'express';

/**
 * [Question 4 — Security] Request logging interceptor.
 *
 * Logs method, path, status code and duration ONLY.
 * It deliberately never logs request bodies, query strings, Authorization
 * headers, cookies, or JWTs — so passwords and tokens can never end up in
 * log files or a log aggregation service.
 */
@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger('HTTP');

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const start = Date.now();
    const request = context.switchToHttp().getRequest<Request>();
    // Strip the query string: search terms are user data and not needed in logs.
    const path = request.url.split('?')[0];
    const { method } = request;

    return next.handle().pipe(
      tap({
        next: () => {
          const response = context.switchToHttp().getResponse<Response>();
          this.logger.log(`${method} ${path} ${response.statusCode} ${Date.now() - start}ms`);
        },
        error: (err: Error & { status?: number }) => {
          this.logger.warn(
            `${method} ${path} ${err.status ?? 500} ${Date.now() - start}ms`,
          );
        },
      }),
    );
  }
}
