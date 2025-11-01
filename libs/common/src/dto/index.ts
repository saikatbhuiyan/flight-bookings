import { IsInt, IsOptional, IsString, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiPropertyOptional } from '@nestjs/swagger';

export class PaginationDto {
  @ApiPropertyOptional({ default: 1, minimum: 1 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional({ default: 10, minimum: 1, maximum: 100 })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(100)
  limit?: number = 10;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  sortBy?: string;

  @ApiPropertyOptional({ enum: ['ASC', 'DESC'] })
  @IsOptional()
  @IsString()
  sortOrder?: 'ASC' | 'DESC' = 'DESC';
}

export class ApiResponseDto<T> {
  success: boolean;
  data?: T;
  message?: string;
  errors?: any[];
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
