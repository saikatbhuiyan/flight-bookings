import { IsInt, IsString, IsOptional, IsObject, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class CreatePaymentIntentDto {
    @ApiProperty({
        description: 'Booking ID',
        example: 123,
    })
    @IsInt()
    bookingId: number;

    @ApiProperty({
        description: 'User ID',
        example: 456,
    })
    @IsInt()
    userId: number;

    @ApiProperty({
        description: 'Payment amount in cents',
        example: 50000,
        minimum: 1,
    })
    @IsInt()
    @Min(1)
    amount: number;

    @ApiPropertyOptional({
        description: 'Currency code (ISO 4217)',
        example: 'USD',
        default: 'USD',
    })
    @IsString()
    @IsOptional()
    currency?: string = 'USD';

    @ApiPropertyOptional({
        description: 'Additional metadata',
        example: { flightNumber: 'AA100', seatClass: 'ECONOMY' },
    })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;

    @ApiPropertyOptional({
        description: 'Payment gateway to use (stripe, paypal)',
        example: 'stripe',
        enum: ['stripe', 'paypal'],
    })
    @IsString()
    @IsOptional()
    gateway?: string;
}
