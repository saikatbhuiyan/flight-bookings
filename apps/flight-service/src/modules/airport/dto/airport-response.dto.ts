import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Simplified city info for airport response
 */
export class CityInfoDto {
    @ApiProperty({ description: 'City ID' })
    @Expose()
    id: number;

    @ApiProperty({ description: 'City name' })
    @Expose()
    name: string;

    @ApiProperty({ description: 'Country name' })
    @Expose()
    country: string;

    @ApiPropertyOptional({ description: 'Country code' })
    @Expose()
    countryCode?: string;
}

/**
 * DTO for airport response
 */
export class AirportResponseDto {
    @ApiProperty({ description: 'Airport ID' })
    @Expose()
    id: number;

    @ApiProperty({ description: 'Airport name' })
    @Expose()
    name: string;

    @ApiProperty({ description: 'IATA code' })
    @Expose()
    code: string;

    @ApiPropertyOptional({ description: 'ICAO code' })
    @Expose()
    icaoCode?: string;

    @ApiPropertyOptional({ description: 'Address' })
    @Expose()
    address?: string;

    @ApiPropertyOptional({ description: 'Latitude' })
    @Expose()
    latitude?: number;

    @ApiPropertyOptional({ description: 'Longitude' })
    @Expose()
    longitude?: number;

    @ApiPropertyOptional({ description: 'Timezone' })
    @Expose()
    timezone?: string;

    @ApiProperty({ description: 'City ID' })
    @Expose()
    cityId: number;

    @ApiPropertyOptional({ description: 'City information', type: CityInfoDto })
    @Expose()
    @Type(() => CityInfoDto)
    city?: CityInfoDto;

    @ApiProperty({ description: 'Active status' })
    @Expose()
    active: boolean;

    @ApiProperty({ description: 'Creation timestamp' })
    @Expose()
    @Type(() => Date)
    createdAt: Date;

    @ApiProperty({ description: 'Last update timestamp' })
    @Expose()
    @Type(() => Date)
    updatedAt: Date;
}
