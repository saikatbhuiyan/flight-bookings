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
