import { Injectable, Logger } from '@nestjs/common';
import { IPaymentGateway } from './payment-gateway.interface';
import { StripeGatewayProvider } from './stripe-gateway.provider';
import { PayPalGatewayProvider } from './paypal-gateway.provider';

export type PaymentGatewayType = 'stripe' | 'paypal';

/**
 * Payment Gateway Factory
 * 
 * Creates payment gateway instances based on configuration.
 * This enables easy swapping between payment providers.
 * 
 * Usage:
 * - Set PAYMENT_GATEWAY env variable to 'stripe' or 'paypal'
 * - Factory will return the appropriate provider
 */
@Injectable()
export class PaymentGatewayFactory {
    private readonly logger = new Logger(PaymentGatewayFactory.name);

    /**
     * Create a payment gateway instance
     * @param gatewayType - Type of gateway to create ('stripe' | 'paypal')
     * @returns Payment gateway instance
     */
    create(gatewayType?: PaymentGatewayType): IPaymentGateway {
        const type = gatewayType || this.getDefaultGateway();

        this.logger.log(`Providing payment gateway: ${type}`);

        switch (type) {
            case 'stripe':
                return new StripeGatewayProvider();
            case 'paypal':
                return new PayPalGatewayProvider();
            default:
                throw new Error(
                    `Unknown payment gateway type: ${type}. Supported: stripe, paypal`,
                );
        }
    }


    /**
     * Get default gateway from environment configuration
     */
    private getDefaultGateway(): PaymentGatewayType {
        const gateway = (process.env.PAYMENT_GATEWAY || 'stripe').toLowerCase();

        if (!['stripe', 'paypal'].includes(gateway)) {
            this.logger.warn(
                `Invalid PAYMENT_GATEWAY value: ${gateway}. Defaulting to 'stripe'`,
            );
            return 'stripe';
        }

        return gateway as PaymentGatewayType;
    }

    /**
     * Get list of supported gateways
     */
    getSupportedGateways(): PaymentGatewayType[] {
        return ['stripe', 'paypal'];
    }
}
