import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { CreatePaymentIntentRequest, CreatePaymentIntentResponse, PaymentClient } from './payment-client.interface';

@Injectable()
export class PaymentMockClient implements PaymentClient {
  createPaymentIntent(_req: CreatePaymentIntentRequest): Promise<CreatePaymentIntentResponse> {
    void _req;
    return Promise.resolve({
      paymentId: `local_mock_${randomUUID()}`,
      clientSecret: null,
      status: 'mocked',
    });
  }
}
