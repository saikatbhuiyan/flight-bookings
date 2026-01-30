import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    MaxLength,
    IsOptional,
    IsNumber,
    Min,
    Max,
    IsInt,
    Length,
} from 'class-validator';

/**
 * Shared DTO for creating a new airport
 */
export class CreateAirportDto {
    @ApiProperty({
        description: 'Airport name',
        example: 'John F. Kennedy International Airport',
        maxLength: 200,
    })
    @IsString()
    @IsNotEmpty()
    @MaxLength(200)
    name: string;

    @ApiProperty({
        description: 'IATA airport code (3 letters)',
        example: 'JFK',
        minLength: 3,
        maxLength: 3,
    })
    @IsString()
    @IsNotEmpty()
    @Length(3, 3)
    code: string;

    @ApiPropertyOptional({
        description: 'ICAO airport code (4 letters)',
        example: 'KJFK',
        minLength: 4,
        maxLength: 4,
    })
    @IsOptional()
    @IsString()
    @Length(4, 4)
    icaoCode?: string;

    @ApiPropertyOptional({
        description: 'Airport address',
        example: 'Queens, NY 11430, USA',
    })
    @IsOptional()
    @IsString()
    address?: string;

    @ApiProperty({
        description: 'City ID',
        example: 1,
    })
    @IsInt()
    @IsNotEmpty()
    cityId: number;

    @ApiPropertyOptional({
        description: 'Latitude coordinate',
        example: 40.6413,
        minimum: -90,
        maximum: 90,
    })
    @IsOptional()
    @IsNumber()
    @Min(-90)
    @Max(90)
    latitude?: number;

    @ApiPropertyOptional({
        description: 'Longitude coordinate',
        example: -73.7781,
        minimum: -180,
        maximum: 180,
    })
    @IsOptional()
    @IsNumber()
    @Min(-180)
    @Max(180)
    longitude?: number;

    @ApiPropertyOptional({
        description: 'Timezone',
        example: 'America/New_York',
        maxLength: 50,
    })
    @IsOptional()
    @IsString()
    @MaxLength(50)
    timezone?: string;
}
