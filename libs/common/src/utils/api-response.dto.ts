import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { resolveMessage } from '../messages';

export class ApiResponseDto<T> {
  @ApiProperty({
    example: true,
    description: 'Indicates if the request was successful',
  })
  success: boolean;

  @ApiPropertyOptional({ description: 'The response data' })
  data?: T;

  @ApiPropertyOptional({
    example: 'Operation successful',
    description: 'Response message',
  })
  message?: string;

  @ApiPropertyOptional({
    example: 'auth.login.success',
    description: 'Stable machine-readable response code',
  })
  code?: string;

  @ApiPropertyOptional({ description: 'Error details if success is false' })
  errors?: any[];

  @ApiPropertyOptional({
    description: 'Metadata for pagination or other purposes',
  })
  meta?: any;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }

  static success<T>(data: T, codeOrMessage?: string): ApiResponseDto<T> {
    const resolved = codeOrMessage ? resolveMessage(codeOrMessage) : undefined;

    return new ApiResponseDto<T>({
      success: true,
      data,
      code: resolved?.code,
      message: resolved?.message,
    });
  }

  static error(
    codeOrMessage: string,
    errors?: any[],
    statusCode?: number,
  ): ApiResponseDto<null> & { statusCode?: number } {
    const resolved = resolveMessage(codeOrMessage);

    return new ApiResponseDto<null>({
      success: false,
      code: resolved.code,
      message: resolved.message,
      errors,
      ...(statusCode !== undefined && { statusCode }),
    }) as ApiResponseDto<null> & { statusCode?: number };
  }

  static paginated<T>(data: T[], page: number, limit: number, total: number): ApiResponseDto<T[]> {
    return new ApiResponseDto<T[]>({
      success: true,
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  }
}
