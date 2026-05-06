import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

type CorrelatedRequest = Request & {
  correlationId?: string;
  traceId?: string;
};

@Injectable()
export class CorrelationIdMiddleware implements NestMiddleware {
  use(req: CorrelatedRequest, res: Response, next: NextFunction) {
    const correlationId =
      (req.headers['x-correlation-id'] as string) ?? (req.headers['x-request-id'] as string) ?? randomUUID();
    const traceId =
      (req.headers['x-b3-traceid'] as string) ??
      (req.headers['traceparent'] as string | undefined)?.split('-')[1] ??
      correlationId;

    req.correlationId = correlationId;
    req.traceId = traceId;
    req.headers['x-correlation-id'] = correlationId;

    res.setHeader('x-correlation-id', correlationId);
    res.setHeader('x-trace-id', traceId);
    next();
  }
}
