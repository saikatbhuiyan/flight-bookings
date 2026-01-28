import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * DTO for city response
 * Transforms entity to API response format
 */
export class CityResponseDto {
    @ApiProperty({ description: 'City ID', example: 1 })
    @Expose()
    id: number;

    @ApiProperty({ description: 'City name', example: 'New York' })
    @Expose()
    name: string;

    @ApiProperty({ description: 'Country name', example: 'United States' })
    @Expose()
    country: string;

    @ApiPropertyOptional({ description: 'ISO country code', example: 'US' })
    @Expose()
    countryCode?: string;

    @ApiPropertyOptional({ description: 'Timezone', example: 'America/New_York' })
    @Expose()
    timezone?: string;

    @ApiPropertyOptional({ description: 'Latitude', example: 40.7128 })
    @Expose()
    latitude?: number;

    @ApiPropertyOptional({ description: 'Longitude', example: -74.006 })
    @Expose()
    longitude?: number;

    @ApiProperty({ description: 'Active status', example: true })
    @Expose()
    active: boolean;

    @ApiPropertyOptional({
        description: 'Number of airports in this city',
        example: 3,
    })
    @Expose()
    airportCount?: number;

    @ApiProperty({ description: 'Creation timestamp' })
    @Expose()
    @Type(() => Date)
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    @Expose()
    @Type(() => Date)
    updatedAt: Date;
}
