import { ConfigService } from '@nestjs/config';

export enum BookingPaymentMode {
  PAYMENT_SERVICE = 'payment-service',
  LOCAL_MOCK = 'local-mock',
}

export function resolveBookingPaymentMode(configService: ConfigService): BookingPaymentMode {
  const raw = configService.get<string>('PAYMENT_REQUIRED');

  if (raw === undefined || raw === null || raw === '') {
    const nodeEnv = (configService.get<string>('NODE_ENV') || 'development').toLowerCase();
    return nodeEnv === 'production' ? BookingPaymentMode.PAYMENT_SERVICE : BookingPaymentMode.LOCAL_MOCK;
  }

  return raw.toLowerCase() === 'false' || raw === '0'
    ? BookingPaymentMode.LOCAL_MOCK
    : BookingPaymentMode.PAYMENT_SERVICE;
}
