import { IsInt, IsString, IsOptional, IsObject, IsEnum, Min } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { PaymentMethod } from '../gateways/payment-gateway.interface';

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
        description: 'Payment amount in cents (smallest currency unit)',
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

    @ApiProperty({
        description: 'Payment method chosen by the customer',
        enum: PaymentMethod,
        example: PaymentMethod.CARD,
        default: PaymentMethod.CARD,
    })
    @IsEnum(PaymentMethod)
    @IsOptional()
    paymentMethod?: PaymentMethod = PaymentMethod.CARD;

    @ApiPropertyOptional({
        description:
            'Advanced: override the processor gateway directly. ' +
            'Prefer paymentMethod for automatic routing.',
        example: 'stripe',
        enum: ['stripe', 'paypal', 'crypto'],
    })
    @IsString()
    @IsOptional()
    gatewayOverride?: string;

    @ApiPropertyOptional({
        description: 'Additional metadata (e.g. flight number, seat class)',
        example: { flightNumber: 'AA100', seatClass: 'ECONOMY' },
    })
    @IsObject()
    @IsOptional()
    metadata?: Record<string, any>;
}
