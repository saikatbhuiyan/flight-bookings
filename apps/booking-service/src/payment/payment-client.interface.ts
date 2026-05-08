import { BookingPaymentMode } from './payment-mode';

export type CreatePaymentIntentRequest = {
  bookingId: number;
  bookingReference: string;
  userId: number;
  amountCents: number;
  currency: string;
  paymentMethod: string;
  metadata?: Record<string, unknown>;
  idempotencyKey?: string;
};

export type CreatePaymentIntentResponse = {
  paymentId: string;
  clientSecret?: string | null;
  status?: string;
  paymentRequired: boolean;
  provider: BookingPaymentMode;
};

export interface PaymentClient {
  createPaymentIntent(req: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse>;
}
