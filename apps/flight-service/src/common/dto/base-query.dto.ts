import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsBoolean } from 'class-validator';
import { Type } from 'class-transformer';
import { PaginationDto } from './pagination.dto';

/**
 * Base query DTO with common search and filter parameters
 * Extends PaginationDto to include search functionality
 */
export class BaseQueryDto extends PaginationDto {
    @ApiPropertyOptional({
        description: 'Search term for text-based filtering',
        example: 'New York',
    })
    @IsOptional()
    @IsString()
    search?: string;

    @ApiPropertyOptional({
        description: 'Filter by active status',
        example: true,
    })
    @IsOptional()
    @Type(() => Boolean)
    @IsBoolean()
    active?: boolean;
}
