import {
    Catch,
    RpcExceptionFilter,
    ArgumentsHost,
    HttpException,
    Logger,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { RpcException } from '@nestjs/microservices';

@Catch()
export class CommonRpcExceptionFilter
    implements RpcExceptionFilter<RpcException> {
    private readonly logger = new Logger(CommonRpcExceptionFilter.name);

    catch(exception: any, host: ArgumentsHost): Observable<any> {
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
        const message = JSON.stringify(error.message);

        if (isRpc) {
            if (status >= 500) {
                this.logger.error(`[RPC Error] ${status} - ${message}`, exception.stack);
            } else {
                this.logger.warn(`[RPC Client Error] ${status} - ${message}`);
            }
        }

        return throwError(() => error);
    }
}
