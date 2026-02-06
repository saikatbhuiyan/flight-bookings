import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsString,
  IsNotEmpty,
  MaxLength,
  IsOptional,
  IsInt,
  Min,
  IsBoolean,
} from 'class-validator';

/**
 * Shared DTO for creating a new airplane
 */
export class CreateAirplaneDto {
  @ApiProperty({
    description: 'Airplane model number',
    example: 'Boeing 737-800',
    maxLength: 50,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(50)
  modelNumber: string;

  @ApiProperty({
    description: 'Manufacturer name',
    example: 'Boeing',
    maxLength: 100,
  })
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  manufacturer: string;

  @ApiPropertyOptional({
    description: 'Registration number (Tail number)',
    example: 'N12345',
    maxLength: 50,
  })
  @IsOptional()
  @IsString()
  @MaxLength(50)
  registrationNumber?: string;

  @ApiProperty({
    description: 'Total seating capacity',
    example: 180,
  })
  @IsInt()
  @Min(1)
  totalCapacity: number;

  @ApiPropertyOptional({ description: 'Number of economy seats', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  economySeats?: number = 0;

  @ApiPropertyOptional({ description: 'Number of business seats', default: 0 })
  @IsOptional()
  @IsInt()
  @Min(0)
  businessSeats?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of first class seats',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  firstClassSeats?: number = 0;

  @ApiPropertyOptional({
    description: 'Number of premium economy seats',
    default: 0,
  })
  @IsOptional()
  @IsInt()
  @Min(0)
  premiumEconomySeats?: number = 0;

  @ApiPropertyOptional({ description: 'Year manufactured', example: 2022 })
  @IsOptional()
  @IsInt()
  yearManufactured?: number;

  @ApiPropertyOptional({ description: 'Maximum range in kilometers' })
  @IsOptional()
  @IsInt()
  maxRangeKm?: number;

  @ApiPropertyOptional({ description: 'Cruising speed in km/h' })
  @IsOptional()
  @IsInt()
  cruisingSpeedKmh?: number;

  @ApiPropertyOptional({ description: 'Active status', default: true })
  @IsOptional()
  @IsBoolean()
  active?: boolean = true;
}
