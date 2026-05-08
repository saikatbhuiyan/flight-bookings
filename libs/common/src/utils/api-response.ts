import { MessageKey, resolveMessage } from '../messages';
import { ApiResponseDto } from './api-response.dto';

export function successResponse<T>(code: MessageKey, data?: T) {
  return ApiResponseDto.success(data ?? null, code);
}

export function errorResponse(code: MessageKey, statusCode = 400, errors?: unknown) {
  return ApiResponseDto.error(code, Array.isArray(errors) ? errors : errors == null ? undefined : [errors], statusCode);
}

export { resolveMessage };
