import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../query/base-query.dto';

/**
 * Shared DTO for querying cities with filters
 */
export class QueryCityDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by country',
        example: 'United States',
    })
    @IsOptional()
    @IsString()
    country?: string;

    @ApiPropertyOptional({
        description: 'Filter by country code',
        example: 'US',
    })
    @IsOptional()
    @IsString()
    countryCode?: string;

    @ApiPropertyOptional({
        description: 'Filter by timezone',
        example: 'America/New_York',
    })
    @IsOptional()
    @IsString()
    timezone?: string;
}
