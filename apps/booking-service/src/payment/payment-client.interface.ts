export type CreatePaymentIntentRequest = {
  bookingId: number;
  bookingReference: string;
  userId: number;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  metadata?: Record<string, any>;
  idempotencyKey?: string;
};

export type CreatePaymentIntentResponse = {
  paymentId: string;
  clientSecret?: string | null;
  status?: string;
};

export interface PaymentClient {
  createPaymentIntent(req: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse>;
}
