import {
  Catch,
  ExceptionFilter,
  ArgumentsHost,
  HttpException,
  Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';

@Catch()
export class CommonRpcExceptionFilter
  implements ExceptionFilter {
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
        }
        : {
          status: exception.status || 500,
          message: exception.message || 'Internal server error',
        };

    const status = error.status;
    const message = typeof error.message === 'object' ? JSON.stringify(error.message) : error.message;

    if (isRpc) {
      if (status >= 500) {
        this.logger.error(
          `[RPC Filter] ${status} - ${message}`,
          exception.stack,
        );
      } else {
        this.logger.warn(`[RPC Filter Client Error] ${status} - ${message}`);
      }
    }

    // Return a consistent structure that the Gateway can parse
    return throwError(() => ({
      status,
      message: error.message,
      errorCode: (exception as any).errorCode || `ERR_RPC_${status}`,
    }));
  }
}
