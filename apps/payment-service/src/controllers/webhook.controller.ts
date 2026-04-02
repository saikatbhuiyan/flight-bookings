import {
    Controller,
    Post,
    Req,
    Headers,
    RawBodyRequest,
    Logger,
    BadRequestException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiExcludeEndpoint } from '@nestjs/swagger';
import { Request } from 'express';
import { WebhookService } from '../services/webhook.service';

@ApiTags('Webhooks')
@Controller('webhooks')
export class WebhookController {
    private readonly logger = new Logger(WebhookController.name);

    constructor(private readonly webhookService: WebhookService) { }

    @Post('stripe')
    @ApiOperation({ summary: 'Stripe webhook endpoint' })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
    async handleStripeWebhook(
        @Req() request: RawBodyRequest<Request>,
        @Headers('stripe-signature') signature: string,
    ) {
        this.logger.log('Received Stripe webhook');

        if (!signature) {
            throw new BadRequestException('Missing stripe-signature header');
        }

        // Get raw body for signature verification
        const payload = request.rawBody || request.body;

        await this.webhookService.handleStripeWebhook(payload, signature);

        return { received: true };
    }

    @Post('paypal')
    @ApiOperation({ summary: 'PayPal webhook endpoint' })
    @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
    @ApiResponse({ status: 400, description: 'Invalid webhook signature' })
    async handlePayPalWebhook(
        @Req() request: RawBodyRequest<Request>,
        @Headers('paypal-transmission-sig') signature: string,
    ) {
        this.logger.log('Received PayPal webhook');

        if (!signature) {
            throw new BadRequestException('Missing paypal-transmission-sig header');
        }

        const payload = request.rawBody || request.body;

        await this.webhookService.handlePayPalWebhook(payload, signature);

        return { received: true };
    }
}
