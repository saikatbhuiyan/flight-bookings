import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

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

  @ApiPropertyOptional({ description: 'Error details if success is false' })
  errors?: any[];

  @ApiPropertyOptional({
    description: 'Metadata for pagination or other purposes',
  })
  meta?: any;

  constructor(partial: Partial<ApiResponseDto<T>>) {
    Object.assign(this, partial);
  }

  static success<T>(data: T, message?: string): ApiResponseDto<T> {
    return new ApiResponseDto<T>({
      success: true,
      data,
      message,
    });
  }

  static error(message: string, errors?: any[]): ApiResponseDto<null> {
    return new ApiResponseDto<null>({
      success: false,
      message,
      errors,
    });
  }

  static paginated<T>(
    data: T[],
    page: number,
    limit: number,
    total: number,
  ): ApiResponseDto<T[]> {
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
