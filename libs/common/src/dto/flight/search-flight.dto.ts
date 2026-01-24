import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
    IsDateString,
    IsEnum,
    IsNotEmpty,
    IsOptional,
    IsString,
    Min,
} from 'class-validator';
import { FlightClass } from '../../enums/flight.enum';

export class SearchFlightDto {
    @ApiProperty({ example: 'DAC', description: 'Departure airport code' })
    @IsString()
    @IsNotEmpty()
    departureAirport: string;

    @ApiProperty({ example: 'CXB', description: 'Arrival airport code' })
    @IsString()
    @IsNotEmpty()
    arrivalAirport: string;

    @ApiProperty({ example: '2026-02-01', description: 'Departure date' })
    @IsDateString()
    @IsNotEmpty()
    departureDate: string;

    @ApiPropertyOptional({
        enum: FlightClass,
        example: 'economy',
        description: 'Preferred flight class',
    })
    @IsEnum(FlightClass)
    @IsOptional()
    flightClass?: string;

    @ApiPropertyOptional({ example: 1, description: 'Number of passengers' })
    @Min(1)
    @IsOptional()
    passengers?: number = 1;
}
