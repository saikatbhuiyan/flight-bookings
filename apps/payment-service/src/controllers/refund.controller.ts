import { Controller, Post, Get, Body, Query, Logger, Headers } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { RefundService } from '../services/refund.service';
import { CreateRefundDto } from '../dto/create-refund.dto';

@ApiTags('Refunds')
@Controller('refunds')
export class RefundController {
  private readonly logger = new Logger(RefundController.name);

  constructor(private readonly refundService: RefundService) {}

  @Post()
  @ApiOperation({ summary: 'Create a refund' })
  @ApiResponse({ status: 201, description: 'Refund created successfully' })
  @ApiResponse({ status: 400, description: 'Invalid request' })
  async createRefund(@Body() dto: CreateRefundDto, @Headers('idempotency-key') idempotencyKey?: string) {
    this.logger.log(`Creating refund for payment ${dto.paymentId}`);
    return this.refundService.createRefund(dto, idempotencyKey);
  }

  @Get()
  @ApiOperation({ summary: 'Get refunds by booking ID' })
  @ApiResponse({ status: 200, description: 'Refunds found' })
  async getRefundsByBooking(@Query('bookingId') bookingId: number) {
    return this.refundService.getRefundsByBooking(bookingId);
  }

  /**
   * RabbitMQ message handler for creating refunds
   */
  @MessagePattern('payment.create_refund')
  async handleCreateRefund(@Payload() data: { dto: CreateRefundDto; idempotencyKey?: string } | CreateRefundDto) {
    const dto = 'dto' in data ? data.dto : data;
    const idempotencyKey = 'dto' in data ? data.idempotencyKey : undefined;
    this.logger.log(`[RabbitMQ] Creating refund for payment ${dto.paymentId}`);
    return this.refundService.createRefund(dto, idempotencyKey);
  }

  /**
   * RabbitMQ message handler for getting refunds
   */
  @MessagePattern('payment.get_refunds')
  async handleGetRefunds(@Payload() data: { bookingId: number }) {
    this.logger.log(`[RabbitMQ] Getting refunds for booking ${data.bookingId}`);
    return this.refundService.getRefundsByBooking(data.bookingId);
  }
}
