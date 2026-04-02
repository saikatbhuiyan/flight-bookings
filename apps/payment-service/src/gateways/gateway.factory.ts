import { Injectable, Logger } from '@nestjs/common';
import {
    IPaymentGateway,
    PaymentMethod,
    PAYMENT_METHOD_GATEWAY_MAP,
} from './payment-gateway.interface';
import { StripeGatewayProvider } from './stripe-gateway.provider';
import { PayPalGatewayProvider } from './paypal-gateway.provider';
// import { CryptoGatewayProvider } from './crypto-gateway.provider';

/**
 * Payment Gateway Registry & Factory
 *
 * Architecture overview
 * ─────────────────────
 *  PaymentMethod (what the *customer* chooses)
 *       │
 *       ▼
 *  PAYMENT_METHOD_GATEWAY_MAP  (from payment-gateway.interface.ts)
 *       │
 *       ▼
 *  Processor Gateway (Stripe / PayPal / Crypto / …)
 *
 * This keeps payment-method UX concerns separate from processor
 * wiring concerns.  Adding a new payment method is often as simple as
 * adding an entry to PAYMENT_METHOD_GATEWAY_MAP — no changes needed
 * here if the underlying processor already exists.
 *
 * Adding a new processor (e.g. Braintree) requires:
 *   1. Create BraintreeGatewayProvider implementing IPaymentGateway
 *   2. Register it in the constructor below
 *   3. Add PAYMENT_METHOD_GATEWAY_MAP entries for its methods
 */
@Injectable()
export class PaymentGatewayFactory {
    private readonly logger = new Logger(PaymentGatewayFactory.name);

    /** Registry: processorName → gateway instance */
    private readonly registry = new Map<string, IPaymentGateway>();

    constructor(
        private readonly stripeGateway: StripeGatewayProvider,
        private readonly paypalGateway: PayPalGatewayProvider,
        // private readonly cryptoGateway: CryptoGatewayProvider,
    ) {
        this.register(stripeGateway);
        this.register(paypalGateway);
        // this.register(cryptoGateway);

        this.logger.log(
            `Gateway registry initialised with processors: [${[...this.registry.keys()].join(', ')}]`,
        );
    }

    // ─── Public API ───────────────────────────────────────────────────────────

    /**
     * Resolve a gateway by *payment method* (recommended).
     *
     * Examples:
     *   getForMethod(PaymentMethod.APPLE_PAY)  → StripeGatewayProvider
     *   getForMethod(PaymentMethod.CRYPTO)      → CryptoGatewayProvider
     *   getForMethod(PaymentMethod.PAYPAL)      → PayPalGatewayProvider
     */
    getForMethod(method: PaymentMethod): IPaymentGateway {
        const processorName = PAYMENT_METHOD_GATEWAY_MAP[method];
        if (!processorName) {
            throw new Error(`No processor mapped for payment method: ${method}`);
        }
        return this.getByName(processorName);
    }

    /**
     * Resolve a gateway by *processor name* (for internal use / legacy).
     * Use getForMethod() in new code.
     */
    getByName(processorName: string): IPaymentGateway {
        const gateway = this.registry.get(processorName.toLowerCase());
        if (!gateway) {
            const available = [...this.registry.keys()].join(', ');
            throw new Error(
                `Unknown payment processor: "${processorName}". Available: [${available}]`,
            );
        }
        return gateway;
    }

    /**
     * Return a gateway by payment method *or* a processor override.
     * This is the main entry-point used by PaymentService.
     *
     * Priority: gatewayOverride > paymentMethod > env default
     */
    resolve(paymentMethod?: PaymentMethod, gatewayOverride?: string): IPaymentGateway {
        if (gatewayOverride) {
            this.logger.warn(
                `Using explicit gateway override: "${gatewayOverride}". ` +
                `Prefer paymentMethod for automatic routing.`,
            );
            return this.getByName(gatewayOverride);
        }

        if (paymentMethod) {
            this.logger.log(`Resolving gateway for payment method: ${paymentMethod}`);
            return this.getForMethod(paymentMethod);
        }

        // Fall back to env-configured default processor
        return this.getByName(this.getDefaultProcessorName());
    }

    /** List all registered payment methods across all gateways */
    getSupportedPaymentMethods(): PaymentMethod[] {
        const methods: PaymentMethod[] = [];
        for (const gateway of this.registry.values()) {
            methods.push(...gateway.getSupportedPaymentMethods());
        }
        return [...new Set(methods)];
    }

    /** List registered processor names */
    getRegisteredProcessors(): string[] {
        return [...this.registry.keys()];
    }

    // ─── Private helpers ──────────────────────────────────────────────────────

    private register(gateway: IPaymentGateway): void {
        const name = gateway.getGatewayName().toLowerCase();
        this.registry.set(name, gateway);
        this.logger.log(
            `Registered processor "${name}" supporting methods: ` +
            `[${gateway.getSupportedPaymentMethods().join(', ')}]`,
        );
    }

    private getDefaultProcessorName(): string {
        const configured = (process.env.PAYMENT_DEFAULT_PROCESSOR || 'stripe').toLowerCase();
        if (!this.registry.has(configured)) {
            this.logger.warn(
                `PAYMENT_DEFAULT_PROCESSOR="${configured}" is not registered. ` +
                `Falling back to "stripe".`,
            );
            return 'stripe';
        }
        return configured;
    }
}
