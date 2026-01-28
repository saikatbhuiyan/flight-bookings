import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsInt } from 'class-validator';
import { Type } from 'class-transformer';
import { BaseQueryDto } from '../query/base-query.dto';

/**
 * Shared DTO for querying airports with filters
 */
export class QueryAirportDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by IATA code',
        example: 'JFK',
    })
    @IsOptional()
    @IsString()
    code?: string;

    @ApiPropertyOptional({
        description: 'Filter by ICAO code',
        example: 'KJFK',
    })
    @IsOptional()
    @IsString()
    icaoCode?: string;

    @ApiPropertyOptional({
        description: 'Filter by city ID',
        example: 1,
    })
    @IsOptional()
    @Type(() => Number)
    @IsInt()
    cityId?: number;

    @ApiPropertyOptional({
        description: 'Filter by city name',
        example: 'New York',
    })
    @IsOptional()
    @IsString()
    cityName?: string;

    @ApiPropertyOptional({
        description: 'Filter by country',
        example: 'United States',
    })
    @IsOptional()
    @IsString()
    country?: string;
}
