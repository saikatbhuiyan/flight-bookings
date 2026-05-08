import { HttpException, HttpStatus } from '@nestjs/common';
import { getMessage, isMessageKey } from '../messages';

export function createHttpExceptionFromRpcError(error: unknown): HttpException {
  const rpcError = error as Record<string, any>;

  let status = HttpStatus.INTERNAL_SERVER_ERROR;

  if (typeof rpcError.status === 'number') {
    status = rpcError.status;
  } else if (typeof rpcError.statusCode === 'number') {
    status = rpcError.statusCode;
  } else if (typeof rpcError.response?.status === 'number') {
    status = rpcError.response.status;
  } else if (typeof rpcError.response?.statusCode === 'number') {
    status = rpcError.response.statusCode;
  }

  let message = 'Internal server error';
  let code: string | undefined;
  let errors: unknown;

  if (typeof rpcError.message === 'string') {
    message = rpcError.message;
  } else if (typeof rpcError.response === 'string') {
    message = rpcError.response;
  } else if (rpcError.response && typeof rpcError.response === 'object') {
    const res = rpcError.response as Record<string, any>;
    code = typeof res.code === 'string' ? res.code : undefined;
    errors = res.errors;
    message = code && isMessageKey(code) ? getMessage(code) : res.message || res.error || JSON.stringify(res);
  } else if (rpcError.message && typeof rpcError.message === 'object') {
    const msg = rpcError.message as Record<string, any>;
    code = typeof msg.code === 'string' ? msg.code : undefined;
    errors = msg.errors;
    message = code && isMessageKey(code) ? getMessage(code) : msg.message || msg.error || JSON.stringify(msg);
  } else if (typeof rpcError.error === 'string') {
    message = rpcError.error;
  }

  if (!code && typeof rpcError.code === 'string') {
    code = rpcError.code;
  }

  return new HttpException(
    {
      ...(code && { code }),
      message,
      ...(errors !== undefined && { errors }),
    },
    status,
  );
}
