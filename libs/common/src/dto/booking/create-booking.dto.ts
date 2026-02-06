import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsEnum,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateBookingDto {
  @ApiProperty({ example: 'uuid-of-flight', description: 'ID of the flight' })
  @IsString()
  @IsNotEmpty()
  flightId: string;

  @ApiProperty({ example: 1, description: 'Number of seats to book' })
  @IsNumber()
  @IsNotEmpty()
  seats: number;

  @ApiPropertyOptional({ example: 'window', description: 'Seat preference' })
  @IsString()
  @IsOptional()
  seatPreference?: string;
}
