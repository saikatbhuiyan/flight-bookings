import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus, Inject } from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError } from 'typeorm';
import { MessageKey, getMessage, isMessageKey } from '../messages';

const DEFAULT_ERROR_CODES: Record<number, MessageKey> = {
  [HttpStatus.BAD_REQUEST]: 'validation.failed',
  [HttpStatus.UNAUTHORIZED]: 'auth.unauthorized',
  [HttpStatus.NOT_FOUND]: 'resource.not_found',
  [HttpStatus.INTERNAL_SERVER_ERROR]: 'server.internal_error',
};

@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER) private readonly logger: any,
  ) {}

  catch(exception: unknown, host: ArgumentsHost) {
    if (host.getType() !== 'http') {
      return;
    }

    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request & { correlationId?: string }>();

    const correlationId = (request['correlationId'] || request.headers['x-correlation-id'] || '') as string;
    const path = request.url;
    const timestamp = new Date().toISOString();
    const isProduction = process.env.NODE_ENV === 'production';

    let status: number;
    let message: string;
    let code: string | undefined;
    let errors: Array<Record<string, unknown> | string> | undefined;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        const responseCode = typeof obj.code === 'string' ? obj.code : undefined;
        code = responseCode;
        message =
          responseCode && isMessageKey(responseCode)
            ? getMessage(responseCode)
            : ((obj.message as string | undefined) ?? (obj.error as string | undefined) ?? 'Error');
        errors = Array.isArray(obj.errors) ? (obj.errors as Array<Record<string, unknown> | string>) : errors;

        // Better handling of class-validator errors which usually come as an array in 'message'
        if (Array.isArray(obj.message)) {
          errors = obj.message;
          code = 'validation.failed';
          message = getMessage('validation.failed');
        }
      } else {
        message = 'Error';
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      code = 'database.query_failed';
      message = getMessage('database.query_failed');

      // Mask database details in production
      if (!isProduction) {
        errors = [(exception as any).detail || exception.message];
      }

      // Handle specific DB errors
      const error = exception as any;
      if (error.code === '23505') {
        code = 'database.duplicate_entry';
        message = getMessage('database.duplicate_entry');
      } else if (error.code === '23503') {
        code = 'database.foreign_key_violation';
        message = getMessage('database.foreign_key_violation');
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'server.internal_error';
      message = exception.message;

      // Mask internal errors in production
      if (isProduction && status === 500) {
        message = getMessage('server.internal_error');
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      code = 'server.unexpected_error';
      message = getMessage('server.unexpected_error');
    }

    code ??= DEFAULT_ERROR_CODES[status];

    const apiVersion = this.configService.get<string>('appConfig.apiVersion', '1.0');

    const apiResponse: ApiResponse<null> = {
      success: false,
      version: apiVersion,
      statusCode: status,
      code,
      message,
      errorCode: code,
      data: null,
      timestamp,
      correlationId,
      path,
      // Hide stack trace in production
      errors: isProduction ? errors : errors || (exception instanceof Error ? [exception.stack] : undefined),
    };

    // Enhanced logging
    const logData = {
      status,
      correlationId,
      path,
      method: request.method,
      userId: request['user'] ? (request['user'] as any).id : undefined,
      errors: apiResponse.errors,
      stack: exception instanceof Error ? exception.stack : undefined,
      timestamp,
    };

    if (status >= 500) {
      this.logger.error(`[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`, logData);
    } else if (status >= 400) {
      this.logger.warn(`[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`, logData);
    } else {
      this.logger.log(`[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`, logData);
    }

    response.status(status).json(apiResponse);
  }
}
