export interface CreatePaymentIntentParams {
    bookingId: number;
    userId: number;
    amount: number; // in cents
    currency: string;
    metadata?: Record<string, any>;
}

export interface PaymentIntent {
    id: string;
    gatewayPaymentId: string;
    amount: number;
    currency: string;
    status: string;
    clientSecret?: string;
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

/**
 * Payment Gateway Interface
 * Implement this interface to add support for new payment gateways
 */
export interface IPaymentGateway {
    /**
     * Create a payment intent (pre-authorization)
     */
    createPaymentIntent(params: CreatePaymentIntentParams): Promise<PaymentIntent>;

    /**
     * Capture/confirm a payment
     */
    capturePayment(gatewayPaymentId: string): Promise<PaymentResult>;

    /**
     * Refund a payment
     */
    refundPayment(params: RefundParams): Promise<RefundResult>;

    /**
     * Verify and parse webhook events
     */
    verifyWebhook(payload: any, signature: string): Promise<WebhookEvent>;

    /**
     * Get payment gateway name
     */
    getGatewayName(): string;
}
