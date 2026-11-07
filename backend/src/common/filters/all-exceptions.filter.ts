import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | object = 'An internal server error occurred. Please try again shortly.';
    let error = 'Internal Server Error';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'object' && res !== null) {
        message = (res as Record<string, unknown>)['message'] || exception.message;
        error = (res as Record<string, unknown>)['error'] as string || exception.name;
      } else {
        message = res;
        error = exception.name;
      }
    } else if (
      exception &&
      typeof exception === 'object' &&
      'code' in exception &&
      typeof (exception as { code: unknown }).code === 'string'
    ) {
      // Prisma or database driver known error codes
      const code = (exception as { code: string }).code;
      if (code === 'P2025') {
        // Record not found
        status = HttpStatus.NOT_FOUND;
        error = 'Not Found';
        message = 'The requested database record or entity was not found.';
      } else if (code === 'P2002') {
        // Unique constraint violation
        status = HttpStatus.CONFLICT;
        error = 'Conflict';
        message = 'A record with these unique details already exists.';
      } else if (code === 'P2003') {
        // Foreign key constraint failed
        status = HttpStatus.BAD_REQUEST;
        error = 'Bad Request';
        message = 'Referenced relational record does not exist or cannot be removed.';
      } else {
        this.logger.error(`Database error [${code}]: ${(exception as unknown as Error).message}`);
        message = 'A database operation could not be completed.';
      }
    } else if (exception instanceof Error) {
      this.logger.error(`Unhandled system error on ${request.method} ${request.url}: ${exception.message}`, exception.stack);
      message = process.env.NODE_ENV === 'production'
        ? 'Internal system processing error.'
        : exception.message;
    }

    // Never leak passwords, tokens, or secrets
    if (typeof message === 'string' && (message.includes('password') || message.includes('secret') || message.includes('token'))) {
      message = 'Operation failed due to authentication or credential error.';
    }

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      error,
      message,
    });
  }
}
