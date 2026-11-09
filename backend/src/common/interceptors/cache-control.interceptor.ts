import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Observable } from 'rxjs';
import { Response } from 'express';
import { CACHE_CONTROL_KEY } from '../decorators/cache-control.decorator';

@Injectable()
export class CacheControlInterceptor implements NestInterceptor {
  constructor(private readonly reflector: Reflector) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const headerValue = this.reflector.getAllAndOverride<string | undefined>(CACHE_CONTROL_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (headerValue && context.getType() === 'http') {
      const response = context.switchToHttp().getResponse<Response>();
      if (response && typeof response.setHeader === 'function') {
        response.setHeader('Cache-Control', headerValue);
      }
    }

    return next.handle();
  }
}

