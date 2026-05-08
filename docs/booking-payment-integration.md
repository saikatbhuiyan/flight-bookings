# Booking → Payment integration (local-friendly)

## Overview

`booking-service` now creates a **payment intent** by calling `payment-service` over RabbitMQ (RMQ RPC).

For local development, payment can be disabled so you can still complete the full booking flow end-to-end.

## How it works

### Booking creation

When you call `POST /bookings`:

- `booking-service` executes the booking saga steps (create booking, lock seats, reserve seats).
- It then requests a payment intent from `payment-service` using RMQ pattern `payment.create_intent`.
- The API response includes:
  - `paymentRequired`
  - `payment.paymentId`
  - `payment.clientSecret` (when the gateway returns one)

### Local payment disabled

If `PAYMENT_REQUIRED=false` in `booking-service`:

- `booking-service` uses a local mock payment client.
- It immediately completes the booking saga using a generated mock transaction id.
- The create-booking response will return `paymentRequired=false` and the booking will already be `BOOKED`.

## Configuration

### `booking-service`

- `PAYMENT_REQUIRED` (default: `true`)
  - `true`: RMQ-call `payment-service` to create a payment intent.
  - `false`: bypass payment-service and auto-complete booking with a local mock.
- `PAYMENT_QUEUE` (default: `payment_queue`)
  - Queue used for RMQ RPC to `payment-service`.
- `RABBITMQ_URL`
  - RMQ broker connection string.

## Notes / constraints

- The integration currently creates a payment intent for `booking.id` (numeric) and includes `bookingReference` in metadata.
- Amount is sent in **cents** (smallest currency unit) derived from `booking.totalCost`.

