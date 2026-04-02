/**
 * Supported payment methods.
 *
 * - CARD           → processed by Stripe or PayPal
 * - APPLE_PAY      → processed by Stripe (Payment Request Button)
 * - GOOGLE_PAY     → processed by Stripe (Payment Request Button)
 * - PAYPAL         → processed by PayPal checkout flow
 * - CRYPTO         → processed by Coinbase Commerce (or similar)
 */
export enum PaymentMethod {
    CARD = 'card',
    APPLE_PAY = 'apple_pay',
    GOOGLE_PAY = 'google_pay',
    PAYPAL = 'paypal',
    CRYPTO = 'crypto',
}

/**
 * Maps each PaymentMethod to the underlying processor gateway name.
 * Apple Pay and Google Pay are both processed through Stripe — only
 * the client-side presentation differs (wallet button vs card form).
 */
export const PAYMENT_METHOD_GATEWAY_MAP: Record<PaymentMethod, string> = {
    [PaymentMethod.CARD]: 'stripe',
    [PaymentMethod.APPLE_PAY]: 'stripe',
    [PaymentMethod.GOOGLE_PAY]: 'stripe',
    [PaymentMethod.PAYPAL]: 'paypal',
    [PaymentMethod.CRYPTO]: 'crypto',
};

// ─── Request/Response DTOs ────────────────────────────────────────────────────

export interface CreatePaymentIntentParams {
    bookingId: number;
    userId: number;
    amount: number; // in cents (or smallest currency unit)
    currency: string;
    /** The payment method the customer is using (card, apple_pay, etc.) */
    paymentMethod: PaymentMethod;
    /** Override the processor gateway (advanced use – prefer paymentMethod) */
    gatewayOverride?: string;
    metadata?: Record<string, any>;
}

export interface PaymentIntent {
    id: string;
    gatewayPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    /**
     * For card/Apple Pay/Google Pay (Stripe): the client_secret used by
     * Stripe.js to confirm the payment on the client side.
     * For PayPal: the order approval redirect URL.
     * For Crypto: the hosted checkout URL.
     */
    clientSecret?: string;
    /** Human-readable payment method stored for audit purposes */
    paymentMethod: PaymentMethod;
    metadata?: Record<string, any>;
}

export interface PaymentResult {
    success: boolean;
    transactionId: string;
    amount: number;
    currency: string;
    status: string;
    errorMessage?: string;
    rawResponse?: any;
}

export interface RefundParams {
    transactionId: string;
    amount: number;
    reason?: string;
}

export interface RefundResult {
    success: boolean;
    refundId: string;
    amount: number;
    status: string;
    errorMessage?: string;
}

export interface WebhookEvent {
    type: string;
    paymentIntentId?: string;
    transactionId?: string;
    status: string;
    data: any;
}

// ─── Gateway Interface ────────────────────────────────────────────────────────

/**
 * Payment Gateway Interface.
 *
 * Implement this interface to add support for a new payment processor.
 * Each processor (Stripe, PayPal, Coinbase Commerce…) maps to one class.
 * A single processor can handle multiple *payment methods* — for example,
 * Stripe handles CARD, APPLE_PAY and GOOGLE_PAY simultaneously via its
 * `automatic_payment_methods` API.
 */
export interface IPaymentGateway {
    /** Unique identifier for this processor (e.g. 'stripe', 'paypal', 'crypto') */
    getGatewayName(): string;

    /** Payment methods this processor supports */
    getSupportedPaymentMethods(): PaymentMethod[];

    /** Create a payment intent (pre-authorisation / order creation) */
    createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;

    /** Capture / confirm a payment after client-side confirmation */
    capturePayment(gatewayPaymentId: string): Promise<PaymentResult>;

    /** Refund a captured payment */
    refundPayment(params: RefundParams): Promise<RefundResult>;

    /** Verify and parse an inbound webhook event from this gateway */
    verifyWebhook(payload: any, signature: string): Promise<WebhookEvent>;
}
