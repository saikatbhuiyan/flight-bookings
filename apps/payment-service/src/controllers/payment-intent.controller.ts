import {
    Controller,
    Post,
    Get,
    Body,
    Param,
    UseGuards,
    Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';

@ApiTags('Payment Intents')
@Controller('payment-intents')
export class PaymentIntentController {
    private readonly logger = new Logger(PaymentIntentController.name);

    constructor(private readonly paymentService: PaymentService) { }

    @Post()
    @ApiOperation({ summary: 'Create a payment intent' })
    @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
    @ApiResponse({ status: 400, description: 'Invalid request' })
    async createPaymentIntent(@Body() dto: CreatePaymentIntentDto) {
        this.logger.log(`Creating payment intent for booking ${dto.bookingId}`);
        return this.paymentService.createPaymentIntent(dto);
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get payment intent by ID' })
    @ApiResponse({ status: 200, description: 'Payment intent found' })
    @ApiResponse({ status: 404, description: 'Payment intent not found' })
    async getPaymentIntent(@Param('id') id: string) {
        return this.paymentService.getPaymentIntent(id);
    }

    @Get('booking/:bookingId')
    @ApiOperation({ summary: 'Get payment intent by booking ID' })
    @ApiResponse({ status: 200, description: 'Payment intent found' })
    @ApiResponse({ status: 404, description: 'Payment intent not found' })
    async getPaymentIntentByBooking(@Param('bookingId') bookingId: number) {
        return this.paymentService.getPaymentIntentByBooking(bookingId);
    }

    /**
     * RabbitMQ message handler for creating payment intents
     */
    @MessagePattern('payment.create_intent')
    async handleCreateIntent(@Payload() dto: CreatePaymentIntentDto) {
        this.logger.log(`[RabbitMQ] Creating payment intent for booking ${dto.bookingId}`);
        return this.paymentService.createPaymentIntent(dto);
    }

    /**
     * RabbitMQ message handler for getting payment intent
     */
    @MessagePattern('payment.get_intent')
    async handleGetIntent(@Payload() data: { id: string }) {
        this.logger.log(`[RabbitMQ] Getting payment intent ${data.id}`);
        return this.paymentService.getPaymentIntent(data.id);
    }
}
