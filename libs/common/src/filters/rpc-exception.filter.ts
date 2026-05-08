import { Catch, ExceptionFilter, ArgumentsHost, HttpException, Logger } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { MessageKey } from '../messages';

const DEFAULT_RPC_ERROR_CODES: Record<number, MessageKey> = {
  400: 'validation.failed',
  401: 'auth.unauthorized',
  404: 'resource.not_found',
  500: 'server.internal_error',
};

@Catch()
export class CommonRpcExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(CommonRpcExceptionFilter.name);

  catch(exception: any, host: ArgumentsHost): Observable<any> | void {
    if (host.getType() !== 'rpc') {
      throw exception;
    }

    const isRpc = host.getType() === 'rpc';
    const error =
      exception instanceof HttpException
        ? {
            status: exception.getStatus(),
            message: exception.getResponse(),
            code:
              typeof exception.getResponse() === 'object' && exception.getResponse() !== null
                ? ((exception.getResponse() as Record<string, unknown>).code as string | undefined)
                : undefined,
          }
        : {
            status: exception.status || 500,
            message: exception.message || 'Internal server error',
            code: exception.code,
          };

    const status = error.status;
    const message = typeof error.message === 'object' ? JSON.stringify(error.message) : error.message;
    const code = error.code || DEFAULT_RPC_ERROR_CODES[status] || 'server.internal_error';

    if (isRpc) {
      if (status >= 500) {
        this.logger.error(`[RPC Filter] ${status} - ${message}`, exception.stack);
      } else {
        this.logger.warn(`[RPC Filter Client Error] ${status} - ${message}`);
      }
    }

    // Return a consistent structure that the Gateway can parse
    return throwError(() => ({
      status,
      message: error.message,
      code,
      errorCode: code,
      errors: exception.errors,
    }));
  }
}
