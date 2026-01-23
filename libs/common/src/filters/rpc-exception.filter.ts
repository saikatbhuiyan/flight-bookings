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
        this.logger.debug(`Catching RPC exception of type: ${exception?.constructor?.name}`);

        const error =
            exception instanceof HttpException
                ? {
                    status: exception.getStatus(),
                    message: exception.getResponse(),
                }
                : {
                    status: 500,
                    message: exception.message || 'Internal server error',
                };

        this.logger.error(
            `[RPC Error] ${error.status} - ${JSON.stringify(error.message)}`,
            exception.stack,
        );

        return throwError(() => error);
    }
}
