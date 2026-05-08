import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, Inject } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Request, Response } from 'express';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { randomUUID } from 'crypto';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import type { LoggerService } from '@nestjs/common';

const SENSITIVE_HEADERS = new Set([
  'authorization',
  'cookie',
  'set-cookie',
  'x-api-key',
  'x-auth-token',
  'x-session-token',
  'proxy-authorization',
]);

const SENSITIVE_BODY_FIELDS = new Set([
  'password',
  'token',
  'secret',
  'apiKey',
  'refreshToken',
  'accessToken',
  'authorization',
]);

const PII_PATH_PATTERNS: Array<{ pattern: RegExp; replacement: string }> = [
  { pattern: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g, replacement: '[email]' },
  { pattern: /eyJ[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]+\.[A-Za-z0-9\-_]*/g, replacement: '[jwt]' },
];

const SUPPRESSED_PATHS = new Set(['/health', '/healthz', '/readyz', '/livez', '/metrics', '/favicon.ico']);
const SLOW_REQUEST_THRESHOLD_MS = 3_000;
const MAX_BODY_LOG_CHARS = 2_048;

type CorrelatedRequest = Request & {
  correlationId?: string;
  traceId?: string;
  user?: { id?: string | number };
};

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly isDev: boolean;

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
    let correlationId: string = randomUUID();
    let requestBody: unknown = {};
    let requestHeaders: Record<string, unknown> = {};
    let traceId: string = correlationId;
    let contentLength: string | string[] | undefined;

    try {
      if (isHttp) {
        const http = context.switchToHttp();
        const request = http.getRequest<CorrelatedRequest>();
        method = request.method;
        url = this.sanitizeUrl(request.url);
        ip = this.extractIp(request);
        userAgent = request.get('User-Agent') || '';
        correlationId = (request.headers['x-correlation-id'] as string) || request.correlationId || correlationId;
        traceId =
          (request.headers['x-trace-id'] as string) ||
          (request.headers['x-b3-traceid'] as string) ||
          request.traceId ||
          correlationId;
        requestBody = request.body;
        requestHeaders = request.headers as Record<string, unknown>;
        contentLength = request.headers['content-length'];
      } else if (isRpc) {
        const rpcContext = context.switchToRpc();
        const data = rpcContext.getData();
        rpcContext.getContext(); // RmqContext or similar
        method = 'RPC';
        url = context.getHandler().name;
        // Try to find correlationId in data payload
        if (data && typeof data === 'object') {
          correlationId = data.correlationId || correlationId;
        }
        requestBody = data;
      }
    } catch (err) {
      this.logger.warn('Failed to extract request context', {
        event: 'logging_context_error',
        error: err instanceof Error ? err.message : String(err),
      });
    }

    const handlerName = context.getHandler().name;
    const controllerName = context.getClass().name;
    const startTime = Date.now();
    const shouldSuppressHttpLog = isHttp && SUPPRESSED_PATHS.has(url);

    if (!shouldSuppressHttpLog) {
      this.logger.log({
        message: `[${correlationId}] Incoming ${isHttp ? 'Request' : 'Message'}: ${method} ${url}`,
        event: isHttp ? 'http_request' : 'message_received',
        method,
        url,
        ip: isHttp ? ip : undefined,
        userAgent: isHttp ? userAgent : undefined,
        correlationId,
        traceId,
        controller: controllerName,
        handler: handlerName,
        contentLength: isHttp ? (contentLength ?? '0') : undefined,
        headers: isHttp && this.isDev ? this.sanitizeHeaders(requestHeaders) : undefined,
        body:
          isHttp && this.shouldLogBody(method)
            ? this.stringifyBody(requestBody)
            : this.stringifyBody(this.isDev ? this.sanitizeBody(requestBody) : requestBody),
        timestamp: new Date().toISOString(),
      });
    }

    return next.handle().pipe(
      tap((responseBody) => {
        const duration = Date.now() - startTime;
        let statusCode = 200;

        if (isHttp) {
          const response = context.switchToHttp().getResponse<Response>();
          statusCode = response.statusCode;
        }

        const reqStr = this.safeStringify(this.sanitizeBody(requestBody));
        const resStr = this.safeStringify(this.isDev ? this.sanitizeBody(responseBody) : responseBody);
        const requestSize = reqStr ? reqStr.length : 0;
        const responseSize = resStr ? resStr.length : 0;
        const isSlow = duration > SLOW_REQUEST_THRESHOLD_MS;

        const message = `[${correlationId}] ${method} ${url} - ${isHttp ? statusCode : 'OK'} (${duration}ms)`;
        const logData = {
          event: isHttp ? 'http_response' : 'message_processed',
          method,
          url,
          statusCode: isHttp ? statusCode : undefined,
          duration,
          correlationId,
          traceId,
          controller: controllerName,
          handler: handlerName,
          requestSize,
          responseSize,
          ip: isHttp ? ip : undefined,
          userAgent: isHttp ? userAgent : undefined,
          alert: isHttp && isSlow ? 'SLOW_REQUEST' : undefined,
          timestamp: new Date().toISOString(),
        };

        if (isHttp && shouldSuppressHttpLog) {
          return;
        }

        if (isHttp && statusCode >= 500) {
          this.logger.error(message, logData as any);
        } else if (isHttp && (statusCode >= 400 || isSlow)) {
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
          errorMessage: error.message,
          stack: this.isDev ? error.stack : undefined,
          correlationId,
          traceId,
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

  private sanitizeBody(body: unknown, depth = 4): unknown {
    if (!body || typeof body !== 'object') return body;
    if (Array.isArray(body)) return depth > 0 ? body.map((i) => this.sanitizeBody(i, depth - 1)) : body;
    const clone: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(body)) {
      clone[k] = SENSITIVE_BODY_FIELDS.has(k)
        ? '***'
        : depth > 0 && typeof v === 'object'
          ? this.sanitizeBody(v, depth - 1)
          : v;
    }
    return clone;
  }

  private sanitizeHeaders(headers: Record<string, unknown>): Record<string, unknown> {
    return Object.fromEntries(
      Object.entries(headers).map(([key, value]) => [
        key,
        SENSITIVE_HEADERS.has(key.toLowerCase()) ? '[REDACTED]' : value,
      ]),
    );
  }

  private sanitizeUrl(url: string): string {
    return PII_PATH_PATTERNS.reduce((acc, { pattern, replacement }) => acc.replace(pattern, replacement), url);
  }

  private extractIp(req: Request): string {
    return (
      (req.headers['x-forwarded-for'] as string | undefined)?.split(',')[0]?.trim() ??
      (req.headers['x-real-ip'] as string | undefined) ??
      req.socket?.remoteAddress ??
      req.ip ??
      'unknown'
    );
  }

  private shouldLogBody(method: string): boolean {
    return ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
  }

  private stringifyBody(body: unknown): string | undefined {
    if (body == null) return undefined;

    const serialized = this.safeStringify(this.sanitizeBody(body));
    return serialized ? this.truncate(serialized) : undefined;
  }

  private truncate(value: string): string {
    if (value.length <= MAX_BODY_LOG_CHARS) return value;
    return value.slice(0, MAX_BODY_LOG_CHARS) + `...[truncated ${value.length - MAX_BODY_LOG_CHARS} chars]`;
  }

  private safeStringify(obj: any): string {
    const cache = new Set();
    try {
      return JSON.stringify(obj, (key, value) => {
        if (typeof value === 'bigint') {
          return value.toString();
        }
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
