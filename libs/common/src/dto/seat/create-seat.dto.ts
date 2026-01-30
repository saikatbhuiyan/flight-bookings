import { ApiProperty } from '@nestjs/swagger';
import {
    IsString,
    IsNotEmpty,
    IsInt,
    Min,
    IsEnum,
    Length,
} from 'class-validator';

export enum SharedSeatType {
    ECONOMY = 'ECONOMY',
    BUSINESS = 'BUSINESS',
    FIRST_CLASS = 'FIRST_CLASS',
    PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
}

/**
 * Shared DTO for creating a single seat
 */
export class CreateSeatDto {
    @ApiProperty({ description: 'Airplane ID' })
    @IsInt()
    @IsNotEmpty()
    airplaneId: number;

    @ApiProperty({ description: 'Seat row number', example: 1 })
    @IsInt()
    @Min(1)
    row: number;

    @ApiProperty({ description: 'Seat column identifier', example: 'A' })
    @IsString()
    @Length(1, 1)
    col: string;

    @ApiProperty({
        description: 'Seat type',
        enum: SharedSeatType,
        default: SharedSeatType.ECONOMY,
    })
    @IsEnum(SharedSeatType)
    type: SharedSeatType;
}

/**
 * Shared DTO for bulk seat creation
 */
export class BulkCreateSeatsDto {
    @ApiProperty({ description: 'Airplane ID' })
    @IsInt()
    @IsNotEmpty()
    airplaneId: number;

    @ApiProperty({ description: 'Number of rows to generate', example: 30 })
    @IsInt()
    @Min(1)
    rows: number;

    @ApiProperty({ description: 'Seats per row (e.g., 6 for A-F)', example: 6 })
    @IsInt()
    @Min(1)
    colsPerRow: number;

    @ApiProperty({
        description: 'Default seat type for generated seats',
        enum: SharedSeatType,
        default: SharedSeatType.ECONOMY,
    })
    @IsEnum(SharedSeatType)
    type: SharedSeatType;
}
