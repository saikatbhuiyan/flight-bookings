import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePaymentIntentRequest, CreatePaymentIntentResponse, PaymentClient } from './payment-client.interface';
import { BookingPaymentMode } from './payment-mode';

@Injectable()
export class PaymentMockClient implements PaymentClient {
  createPaymentIntent(_req: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    void _req;
    return Promise.resolve({
      paymentId: `local_mock_${randomUUID()}`,
      clientSecret: null,
      status: 'confirmed',
      paymentRequired: false,
      provider: BookingPaymentMode.LOCAL_MOCK,
    });
  }
}
