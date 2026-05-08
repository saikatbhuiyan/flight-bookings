# Booking → Payment integration (local-friendly)

## Overview

`booking-service` now creates a **payment intent** by calling `payment-service` over RabbitMQ (RMQ RPC).

For local development, payment can stay disabled so you can still complete the full booking flow end-to-end without starting `payment-service`.

This document also captures the latest integration changes:

- service-level `.env` files are loaded automatically from `apps/<service>/.env`
- booking → payment RMQ calls now forward the idempotency key
- payment-init failures now trigger booking compensation instead of leaving reserved seats behind
- local mock payment mode returns explicit response metadata to the caller

## How it works

### Booking creation

When you call `POST /bookings`:

- `booking-service` executes the booking saga steps (create booking, lock seats, reserve seats).
- It then requests a payment intent from `payment-service` using RMQ pattern `payment.create_intent`.
- The RMQ payload includes the same idempotency key generated from the booking reference.
- The API response includes:
  - `paymentRequired`
  - `autoCompleted`
  - `payment.paymentId`
  - `payment.clientSecret` (when the gateway returns one)
  - `payment.provider`

### Local payment disabled

If `booking-service` resolves to local mock mode:

- `booking-service` uses a local mock payment client.
- It immediately completes the booking saga using a generated mock transaction id.
- The create-booking response returns `paymentRequired=false`, `autoCompleted=true`, and the booking is already `BOOKED`.
- The `payment.provider` field is `local-mock`.

### Payment-service enabled

If `booking-service` resolves to the RMQ payment path:

- it calls `payment-service` over `payment.create_intent`
- the booking stays `PENDING`
- the response returns `paymentRequired=true`
- the `payment.provider` field is `payment-service`

### Failure handling

If booking saga creation succeeds but payment intent creation fails:

- `booking-service` now compensates the booking saga
- reserved flight seats are released
- Redis seat locks are released
- the booking is marked cancelled instead of being left in a pending half-created state

## Configuration

### `booking-service`

- `PAYMENT_REQUIRED`
  - `true`: call `payment-service` over RMQ to create a payment intent.
  - `false`: bypass `payment-service` and auto-complete booking with a local mock.
  - unset:
    - `development` defaults to local mock
    - `production` defaults to real `payment-service`
- `PAYMENT_QUEUE` (default: `payment_queue`)
  - Queue used for RMQ RPC to `payment-service`.
- `RABBITMQ_URL`
  - RMQ broker connection string.

### Local default

To make local mock mode explicit, set this in your local `apps/booking-service/.env`:

```bash
PAYMENT_REQUIRED=false
```

If `PAYMENT_REQUIRED` is omitted entirely, `development` still defaults to local mock mode.

## Notes / constraints

- The integration currently creates a payment intent for `booking.id` (numeric) and includes `bookingReference` in metadata.
- Amount is sent in **cents** (smallest currency unit) derived from `booking.totalCost`.
- Stripe is the supported real gateway path in this repo today. PayPal is registered but intentionally returns `NotImplemented`.
