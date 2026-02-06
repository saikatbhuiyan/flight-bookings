import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { ApiResponse } from '../types';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { ConfigService } from '@nestjs/config';
import { QueryFailedError } from 'typeorm';

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

    const correlationId = (request['correlationId'] ||
      request.headers['x-correlation-id'] ||
      '') as string;
    const path = request.url;
    const timestamp = new Date().toISOString();
    const isProduction = process.env.NODE_ENV === 'production';

    let status: number;
    let message: string;
    let errorCode: string;
    let errors: Array<Record<string, unknown> | string> | undefined;

    console.log(exception);

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      // Default error code based on status
      errorCode = `ERR_${HttpStatus[status] || 'UNKNOWN'}`;

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const obj = res as Record<string, unknown>;
        message =
          (obj.message as string | undefined) ??
          (obj.error as string | undefined) ??
          'Error';

        // Better handling of class-validator errors which usually come as an array in 'message'
        if (Array.isArray(obj.message)) {
          errors = obj.message;
          errorCode = 'ERR_VALIDATION_FAILED';
        }
      } else {
        message = 'Error';
      }
    } else if (exception instanceof QueryFailedError) {
      status = HttpStatus.BAD_REQUEST;
      message = 'Database query failed';
      errorCode = 'ERR_DATABASE_ERROR';

      // Mask database details in production
      if (!isProduction) {
        errors = [(exception as any).detail || exception.message];
      }

      // Handle specific DB errors
      const error = exception as any;
      if (error.code === '23505') {
        message = 'Duplicate entry';
        errorCode = 'ERR_DUPLICATE_ENTRY';
      } else if (error.code === '23503') {
        message = 'Foreign key constraint violation';
        errorCode = 'ERR_FOREIGN_KEY_VIOLATION';
      }
    } else if (exception instanceof Error) {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = exception.message;
      errorCode = 'ERR_INTERNAL_SERVER_ERROR';

      // Mask internal errors in production
      if (isProduction && status === 500) {
        message = 'An unexpected error occurred. Please try again later.';
      }
    } else {
      status = HttpStatus.INTERNAL_SERVER_ERROR;
      message = 'Unexpected error';
      errorCode = 'ERR_UNEXPECTED';
    }

    const apiVersion = this.configService.get<string>(
      'appConfig.apiVersion',
      '1.0',
    );

    const apiResponse: ApiResponse<null> = {
      success: false,
      version: apiVersion,
      statusCode: status,
      message,
      errorCode,
      data: null,
      timestamp,
      correlationId,
      path,
      // Hide stack trace in production
      errors: isProduction
        ? errors
        : errors ||
          (exception instanceof Error ? [exception.stack] : undefined),
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
      this.logger.error(
        `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
        logData,
      );
    } else if (status >= 400) {
      this.logger.warn(
        `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
        logData,
      );
    } else {
      this.logger.log(
        `[${correlationId}] ${request.method} ${request.url} - ${status} - ${message}`,
        logData,
      );
    }

    response.status(status).json(apiResponse);
  }
}
