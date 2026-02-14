import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  Inject,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { LoggerService } from '@nestjs/common';

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly isDev: boolean;
  private readonly sensitiveFields = [
    'password',
    'token',
    'secret',
    'apiKey',
    'refreshToken',
  ];

  constructor(
    private readonly configService: ConfigService,
    @Inject(WINSTON_MODULE_NEST_PROVIDER)
    private readonly logger: LoggerService,
  ) {
    const env = this.configService.get<string>('NODE_ENV', 'development');
    this.isDev = env !== 'production';
  }

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const contextType = context.getType();
    const isHttp = contextType === 'http';
    const isRpc = contextType === 'rpc';

    let method = 'UNKNOWN';
    let url = 'UNKNOWN';
    let ip = 'UNKNOWN';
    let userAgent = '';
    let correlationId = randomUUID();
    let requestBody: any = {};
    let requestHeaders: any = {};

    try {
      if (isHttp) {
        const http = context.switchToHttp();
        const request = http.getRequest<Request>();
        method = request.method;
        url = request.url;
        ip = request.ip;
        userAgent = request.get('User-Agent') || '';
        correlationId =
          (request.headers['x-correlation-id'] as string) ||
          (request as any).correlationId ||
          correlationId;
        requestBody = request.body;
        requestHeaders = request.headers;
      } else if (isRpc) {
        const rpcContext = context.switchToRpc();
        const data = rpcContext.getData();
        const ctx = rpcContext.getContext(); // RmqContext or similar
        method = 'RPC';
        url = context.getHandler().name;
        // Try to find correlationId in data payload
        if (data && typeof data === 'object') {
          correlationId = data.correlationId || correlationId;
        }
        requestBody = data;
      }
    } catch (err) {
      console.warn('Error extracting request context in LoggingInterceptor', err);
    }

    const handlerName = context.getHandler().name;
    const controllerName = context.getClass().name;
    const startTime = Date.now();

    console.log(`[LoggingInterceptor] INTERCEPT: ${controllerName}.${handlerName}`);

    // Log incoming request
    this.logger.log({
      message: `[${correlationId}] Incoming ${isHttp ? 'Request' : 'Message'}: ${method} ${url}`,
      event: isHttp ? 'request_received' : 'message_received',
      method,
      url,
      ip: isHttp ? ip : undefined,
      userAgent: isHttp ? userAgent : undefined,
      correlationId,
      controller: controllerName,
      handler: handlerName,
      headers: isHttp && this.isDev ? this.sanitize(requestHeaders) : undefined,
      body: this.isDev ? this.sanitize(requestBody) : undefined,
      timestamp: new Date().toISOString(),
    });

    return next.handle().pipe(
      tap((responseBody) => {
        console.log(`[LoggingInterceptor] TAP: ${controllerName}.${handlerName}`);
        const duration = Date.now() - startTime;
        let statusCode = 200;

        if (isHttp) {
          const response = context.switchToHttp().getResponse<Response>();
          statusCode = response.statusCode;
        }

        const reqStr = this.safeStringify(requestBody);
        const resStr = this.safeStringify(
          this.isDev ? this.sanitize(responseBody) : responseBody,
        );
        const requestSize = reqStr ? reqStr.length : 0;
        const responseSize = resStr ? resStr.length : 0;

        const message = `[${correlationId}] ${method} ${url} - ${isHttp ? statusCode : 'OK'} (${duration}ms)`;
        const logData = {
          event: isHttp ? 'response_sent' : 'message_processed',
          method,
          url,
          statusCode: isHttp ? statusCode : undefined,
          duration,
          correlationId,
          controller: controllerName,
          handler: handlerName,
          requestSize,
          responseSize,
          timestamp: new Date().toISOString(),
        };

        if (isHttp && statusCode >= 500) {
          this.logger.error(message, logData as any);
        } else if (isHttp && statusCode >= 400) {
          this.logger.warn(message, logData as any);
        } else {
          this.logger.log(message, logData as any);
        }
      }),
      catchError((error: HttpException | Error) => {
        const duration = Date.now() - startTime;
        const status = error instanceof HttpException ? error.getStatus() : 500;
        const message = `[${correlationId}] ${method} ${url} - ${status} (${duration}ms) - ${error.message}`;

        const logData = {
          event: 'error',
          method,
          url,
          status,
          duration,
          message: error.message,
          stack: this.isDev ? error.stack : undefined,
          correlationId,
          controller: controllerName,
          handler: handlerName,
          timestamp: new Date().toISOString(),
        };

        if (status >= 500) {
          this.logger.error(message, logData as any);
        } else {
          this.logger.warn(message, logData as any);
        }

        return throwError(() => error);
      }),
    );
  }

  private sanitize(body: unknown, depth = 1): unknown {
    if (!body || typeof body !== 'object') return body;
    if (Array.isArray(body))
      return depth > 0 ? body.map((i) => this.sanitize(i, depth - 1)) : body;
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      clone[k] = this.sensitiveFields.includes(k)
        ? '***'
        : depth > 0 && typeof v === 'object'
          ? this.sanitize(v, depth - 1)
          : v;
    }
    return clone;
  }

  private safeStringify(obj: any): string {
    const cache = new Set();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'object' && value !== null) {
          if (cache.has(value)) {
            return '[Circular]';
          }
          cache.add(value);
        }
        return value;
      });
    } catch (error) {
      return `[Stringify Error: ${error.message}]`;
    }
  }
}
