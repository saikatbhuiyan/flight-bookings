import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  IsNumber,
  IsDateString,
  IsOptional,
  IsInt,
  Min,
  IsEnum,
} from 'class-validator';
import { FlightClass } from '../../enums/flight.enum';

/**
 * Shared DTO for creating a new flight
 */
export class SharedCreateFlightDto {
  @ApiProperty({ description: 'Flight number', example: 'AI 101' })
  @IsString()
  @IsNotEmpty()
  flightNumber: string;

  @ApiProperty({ description: 'Airplane ID' })
  @IsInt()
  @IsNotEmpty()
  airplaneId: number;

  @ApiProperty({ description: 'Departure airport ID' })
  @IsInt()
  @IsNotEmpty()
  departureAirportId: number;

  @ApiProperty({ description: 'Arrival airport ID' })
  @IsInt()
  @IsNotEmpty()
  arrivalAirportId: number;

  @ApiProperty({
    description: 'Departure time',
    example: '2026-06-01T10:00:00Z',
  })
  @IsDateString()
  @IsNotEmpty()
  departureTime: string;

  @ApiProperty({ description: 'Arrival time', example: '2026-06-01T14:00:00Z' })
  @IsDateString()
  @IsNotEmpty()
  arrivalTime: string;

  @ApiProperty({ description: 'Ticket price', example: 500.0 })
  @IsNumber()
  @Min(0)
  price: number;
}

/**
 * Shared DTO for searching flights
 */
export class SharedSearchFlightDto {
  @ApiPropertyOptional({
    example: 'DAC',
    description: 'Departure airport code',
  })
  @IsOptional()
  @IsString()
  departureAirport?: string;

  @ApiPropertyOptional({ example: 'CXB', description: 'Arrival airport code' })
  @IsOptional()
  @IsString()
  arrivalAirport?: string;

  @ApiPropertyOptional({ example: '2026-02-01', description: 'Departure date' })
  @IsOptional()
  @IsDateString()
  date?: string;

  @ApiPropertyOptional({
    enum: FlightClass,
    example: FlightClass.ECONOMY,
    description: 'Preferred flight class',
  })
  @IsOptional()
  @IsEnum(FlightClass)
  flightClass?: FlightClass;

  @ApiPropertyOptional({ example: 1, description: 'Number of passengers' })
  @IsOptional()
  @IsInt()
  @Min(1)
  passengers?: number = 1;
}
