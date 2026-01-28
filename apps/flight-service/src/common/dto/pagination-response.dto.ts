import { ApiProperty } from '@nestjs/swagger';

/**
 * Pagination metadata
 */
export class PaginationMeta {
    @ApiProperty({ description: 'Current page number', example: 1 })
    page: number;

    @ApiProperty({ description: 'Items per page', example: 10 })
    limit: number;

    @ApiProperty({ description: 'Total number of items', example: 100 })
    total: number;

    @ApiProperty({ description: 'Total number of pages', example: 10 })
    totalPages: number;

    @ApiProperty({ description: 'Has previous page', example: false })
    hasPrevious: boolean;

    @ApiProperty({ description: 'Has next page', example: true })
    hasNext: boolean;

    constructor(page: number, limit: number, total: number) {
        this.page = page;
        this.limit = limit;
        this.total = total;
        this.totalPages = Math.ceil(total / limit);
        this.hasPrevious = page > 1;
        this.hasNext = page < this.totalPages;
    }
}

/**
 * Generic paginated response wrapper
 */
export class PaginatedResponseDto<T> {
    @ApiProperty({ description: 'Array of items' })
    data: T[];

    @ApiProperty({ description: 'Pagination metadata', type: PaginationMeta })
    meta: PaginationMeta;

    constructor(data: T[], page: number, limit: number, total: number) {
        this.data = data;
        this.meta = new PaginationMeta(page, limit, total);
    }

    /**
     * Static factory method for creating paginated responses
     */
    static create<T>(
        data: T[],
        page: number,
        limit: number,
        total: number,
    ): PaginatedResponseDto<T> {
        return new PaginatedResponseDto(data, page, limit, total);
    }
}
