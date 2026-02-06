import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Expose, Type } from 'class-transformer';

/**
 * Airplane Response DTO
 */
export class AirplaneResponseDto {
  @ApiProperty({ description: 'Airplane ID' })
  @Expose()
  id: number;

  @ApiProperty({ description: 'Model number' })
  @Expose()
  modelNumber: string;

  @ApiProperty({ description: 'Manufacturer' })
  @Expose()
  manufacturer: string;

  @ApiPropertyOptional({ description: 'Registration number' })
  @Expose()
  registrationNumber?: string;

  @ApiProperty({ description: 'Total capacity' })
  @Expose()
  totalCapacity: number;

  @ApiProperty({ description: 'Economy seats' })
  @Expose()
  economySeats: number;

  @ApiProperty({ description: 'Business seats' })
  @Expose()
  businessSeats: number;

  @ApiProperty({ description: 'First class seats' })
  @Expose()
  firstClassSeats: number;

  @ApiProperty({ description: 'Premium economy seats' })
  @Expose()
  premiumEconomySeats: number;

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
