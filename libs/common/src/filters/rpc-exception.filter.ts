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
            `Microservice Error: ${JSON.stringify(error.message)}`,
            exception.stack,
        );

        return throwError(() => error);
    }
}
