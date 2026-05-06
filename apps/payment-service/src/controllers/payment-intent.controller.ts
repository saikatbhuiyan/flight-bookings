import { Controller, Post, Get, Body, Param, Logger, Headers, Query } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { PaymentService } from '../services/payment.service';
import { CreatePaymentIntentDto } from '../dto/create-payment-intent.dto';
import { ConfirmPaymentIntentDto } from '../dto/confirm-payment-intent.dto';
import { QueryLedgerEntriesDto } from '../dto/query-ledger-entries.dto';

@ApiTags('Payment Intents')
@Controller('payment-intents')
export class PaymentIntentController {
  private readonly logger = new Logger(PaymentIntentController.name);

  constructor(private readonly paymentService: PaymentService) {}

  @Post()
  @ApiOperation({ summary: 'Create a payment intent' })
  @ApiResponse({ status: 201, description: 'Payment intent created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createPaymentIntent(@Body() dto: CreatePaymentIntentDto, @Headers('idempotency-key') idempotencyKey?: string) {
    this.logger.log(`Creating payment intent for booking ${dto.bookingId}`);
    return this.paymentService.createPaymentIntent(dto, idempotencyKey);
  }

  @Post(':id/confirm')
  @ApiOperation({ summary: 'Confirm a payment intent' })
  @ApiResponse({ status: 200, description: 'Payment intent confirmed successfully' })
  @ApiResponse({ status: 404, description: 'Payment intent not found' })
  async confirmPaymentIntent(
    @Param('id') id: string,
    @Body() dto: ConfirmPaymentIntentDto,
    @Headers('idempotency-key') idempotencyKey?: string,
  ) {
    return this.paymentService.confirmPaymentIntent(id, dto, idempotencyKey);
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

  @Get('/ledger/entries')
  @ApiOperation({ summary: 'Query ledger entries for reporting and reconciliation' })
  @ApiResponse({ status: 200, description: 'Ledger entries returned successfully' })
  async getLedgerEntries(@Query() query: QueryLedgerEntriesDto) {
    return this.paymentService.getLedgerEntries(query);
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

  @MessagePattern('payment.confirm_intent')
  async handleConfirmIntent(@Payload() data: { id: string; dto?: ConfirmPaymentIntentDto; idempotencyKey?: string }) {
    this.logger.log(`[RabbitMQ] Confirming payment intent ${data.id}`);
    return this.paymentService.confirmPaymentIntent(data.id, data.dto || {}, data.idempotencyKey);
  }
}
