import {
    Entity,
    PrimaryGeneratedColumn,
    Column,
    CreateDateColumn,
    UpdateDateColumn,
    Index,
} from 'typeorm';

export enum SagaStatus {
    INITIATED = 'INITIATED',
    SEATS_LOCKED = 'SEATS_LOCKED',
    FLIGHT_RESERVED = 'FLIGHT_RESERVED',
    PAYMENT_PROCESSING = 'PAYMENT_PROCESSING',
    PAYMENT_COMPLETED = 'PAYMENT_COMPLETED',
    BOOKING_CONFIRMED = 'BOOKING_CONFIRMED',
    FAILED = 'FAILED',
    COMPENSATING = 'COMPENSATING',
    COMPENSATED = 'COMPENSATED',
}

@Entity('saga_states')
@Index(['sagaId'], { unique: true })
@Index(['bookingId'])
@Index(['status'])
@Index(['createdAt'])
export class SagaState {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'saga_id', type: 'varchar', length: 36, unique: true })
    sagaId: string;

    @Column({ name: 'saga_type', type: 'varchar', length: 50 })
    sagaType: string;

    @Column({ name: 'booking_id', type: 'varchar', length: 36 })
    bookingId: string;

    @Column({
        type: 'enum',
        enum: SagaStatus,
        default: SagaStatus.INITIATED,
    })
    status: SagaStatus;

    @Column({ name: 'current_step', type: 'int', default: 0 })
    currentStep: number;

    @Column({ name: 'total_steps', type: 'int', default: 6 })
    totalSteps: number;

    @Column({ type: 'jsonb', nullable: false })
    payload: Record<string, any>;

    @Column({ type: 'jsonb', nullable: true })
    context: Record<string, any>;

    @Column({ name: 'error_message', type: 'text', nullable: true })
    errorMessage: string;

    @Column({ name: 'retry_count', type: 'int', default: 0 })
    retryCount: number;

    @Column({ name: 'max_retries', type: 'int', default: 3 })
    maxRetries: number;

    @Column({ name: 'last_error_at', type: 'timestamp', nullable: true })
    lastErrorAt: Date;

    @Column({ name: 'completed_at', type: 'timestamp', nullable: true })
    completedAt: Date;

    @Column({ name: 'compensated_at', type: 'timestamp', nullable: true })
    compensatedAt: Date;

    @Column({ name: 'idempotency_key', type: 'varchar', length: 100, nullable: true })
    idempotencyKey: string;

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}


// ============================================
// MAIN BOOTSTRAP WITH TRACING
// ============================================

// apps/booking-service/src/main.ts
// import { NestFactory } from '@nestjs/core';
// import { AppModule } from './app.module';
// import { initializeTracing } from '@app/telemetry/tracing';

// async function bootstrap() {
//     // Initialize OpenTelemetry tracing
//     initializeTracing('booking-service');

//     const app = await NestFactory.create(AppModule);

//     await app.listen(3003);
//     console.log('Booking Service started on port 3003');
//     console.log('OpenTelemetry tracing enabled - Export to Jaeger');
// }
// bootstrap();

// ============================================
// DOCKER COMPOSE WITH JAEGER
// ============================================

/*
// docker-compose.yml additions:

services:
  jaeger:
    image: jaegertracing/all-in-one:latest
    ports:
      - "5775:5775/udp"
      - "6831:6831/udp"
      - "6832:6832/udp"
      - "5778:5778"
      - "16686:16686"  # Jaeger UI
      - "14268:14268"  # Jaeger collector
      - "14250:14250"
      - "9411:9411"
    environment:
      - COLLECTOR_ZIPKIN_HOST_PORT=:9411
    networks:
      - flight-booking-network

// Access Jaeger UI at: http://localhost:16686
*/

// ============================================
// PACKAGE.JSON DEPENDENCIES
// ============================================

/*
{
  "dependencies": {
    "@golevelup/nestjs-rabbitmq": "^5.0.0",
    "@nestjs/event-emitter": "^2.0.0",
    "@nestjs/schedule": "^4.0.0",
    "@opentelemetry/api": "^1.7.0",
    "@opentelemetry/sdk-node": "^0.45.0",
    "@opentelemetry/auto-instrumentations-node": "^0.40.0",
    "@opentelemetry/exporter-jaeger": "^1.19.0",
    "@opentelemetry/semantic-conventions": "^1.19.0",
    "uuid": "^9.0.0"
  }
}
*/

// ============================================
// COMPLETE FLOW DIAGRAM
// ============================================

/*
┌─────────────────────────────────────────────────────────────────────┐
│              PRODUCTION-GRADE BOOKING SAGA FLOW                      │
└─────────────────────────────────────────────────────────────────────┘

1. USER CREATES BOOKING (With Idempotency Key)
   POST /bookings
   Headers: X-Idempotency-Key: unique-key-123
   ↓
2. CHECK IDEMPOTENCY
   ✓ Query saga_states WHERE idempotency_key = 'unique-key-123'
   ✓ If exists → Return existing booking (idempotent)
   ✓ If not → Continue
   ↓
3. CREATE SAGA STATE (Transaction 1)
   BEGIN TRANSACTION
     ✓ INSERT INTO saga_states (sagaId, bookingId, status: INITIATED, step: 0)
     ✓ INSERT INTO bookings (status: INITIATED)
     ✓ INSERT INTO outbox_events (eventType: 'booking.created')
   COMMIT
   SPAN: saga.step1.createBooking [traceId: abc123]
   ↓
4. LOCK SEATS IN REDIS (Idempotent)
   ✓ Lua script checks if bookingId already has locks
   ✓ If yes → Success (idempotent)
   ✓ If no → Lock all seats or fail
   BEGIN TRANSACTION
     ✓ UPDATE saga_states SET step = 2, status = SEATS_LOCKED
   COMMIT
   SPAN: saga.step2.lockSeats [traceId: abc123]
   ↓
5. RESERVE FLIGHT SEATS (Transaction 2 + Outbox)
   BEGIN TRANSACTION
     ✓ INSERT INTO outbox_events (eventType: 'flight.reserve-seats')
     ✓ UPDATE saga_states SET step = 3, status = FLIGHT_RESERVED
     ✓ UPDATE bookings SET status = PENDING
   COMMIT
   SPAN: saga.step3.reserveFlightSeats [traceId: abc123]
   ↓
6. OUTBOX PUBLISHER (Cron: Every 5 seconds)
   ✓ SELECT * FROM outbox_events WHERE status = PENDING
   ✓ Publish to RabbitMQ with headers: {x-trace-id: abc123}
   ✓ UPDATE outbox_events SET status = PUBLISHED
   SPAN: outbox.publishEvent [traceId: abc123]
   ↓
7. FLIGHT SERVICE RECEIVES EVENT
   RabbitMQ Queue: flight-service.reserve-seats
   ✓ Extract eventId from message
   ✓ Check: SELECT * FROM processed_events WHERE event_id = eventId
   ✓ If exists → ACK message (idempotent, already processed)
   ✓ If not → Continue
   BEGIN TRANSACTION
     ✓ SELECT * FROM flights WHERE id = 123 FOR UPDATE
     ✓ UPDATE flights SET economy_seats_available -= 2
     ✓ INSERT INTO processed_events (eventId, eventType)
   COMMIT
   ✓ ACK message
   SPAN: flight.handleReserveSeats [traceId: abc123]
   ↓
8. USER COMPLETES PAYMENT
   POST /bookings/{id}/complete
   ↓
9. CONFIRM BOOKING (Transaction 3 + Outbox)
   BEGIN TRANSACTION
     ✓ INSERT INTO outbox_events (eventType: 'flight.confirm-seats')
     ✓ UPDATE saga_states SET step = 6, status = BOOKING_CONFIRMED
     ✓ UPDATE bookings SET status = BOOKED, payment_status = COMPLETED
     ✓ INSERT INTO outbox_events (eventType: 'booking.confirmed')
   COMMIT
   ✓ Release Redis locks (outside transaction)
   SPAN: saga.step6.confirmBooking [traceId: abc123]

┌─────────────────────────────────────────────────────────────────────┐
│                    COMPENSATION FLOW (If Failure)                    │
└─────────────────────────────────────────────────────────────────────┘

SCENARIO: Step 5 fails (flight service down)
   ↓
1. CATCH ERROR IN SAGA
   ✓ saga.currentStep = 3 (FLIGHT_RESERVED)
   ↓
2. START COMPENSATION (Transaction)
   BEGIN TRANSACTION
     ✓ UPDATE saga_states SET status = COMPENSATING
     ✓ INSERT INTO outbox_events (eventType: 'flight.release-seats')
     ✓ UPDATE bookings SET status = CANCELLED, reason = 'Saga failed'
   COMMIT
   ✓ Release Redis locks
   SPAN: saga.compensate [traceId: abc123]
   ↓
3. OUTBOX PUBLISHES COMPENSATION EVENT
   ✓ Publish 'flight.release-seats' to RabbitMQ
   ↓
4. FLIGHT SERVICE RECEIVES COMPENSATION
   ✓ Check processed_events (idempotent)
   BEGIN TRANSACTION
     ✓ SELECT * FROM flights FOR UPDATE
     ✓ UPDATE flights SET economy_seats_available += 2
     ✓ INSERT INTO processed_events
   COMMIT
   SPAN: flight.handleReleaseSeats [traceId: abc123]
   ↓
5. SAGA MARKED AS COMPENSATED
   ✓ UPDATE saga_states SET status = COMPENSATED

┌─────────────────────────────────────────────────────────────────────┐
│                   RETRY & DLQ FLOW                                   │
└─────────────────────────────────────────────────────────────────────┘

SCENARIO: Flight service handler throws error
   ↓
1. RABBITMQ REDELIVERS MESSAGE
   Retry 1: After 1 second
   ✓ Message redelivered to queue
   ✓ Handler attempts processing again
   ✓ If success → ACK
   ✓ If fails → Continue
   ↓
2. RETRY 2 & 3
   Retry 2: After exponential backoff
   Retry 3: Last attempt
   ↓
3. MAX RETRIES EXCEEDED
   ✓ RabbitMQ moves message to DLQ
   ✓ Queue: booking.dlq
   ✓ Routing key: flight.reserve-seats.failed
   ↓
4. DLQ CONSUMER (Manual intervention)
   ✓ Alert sent to ops team
   ✓ Message stored in DLQ for analysis
   ✓ Can be replayed manually after fixing issue

┌─────────────────────────────────────────────────────────────────────┐
│              DISTRIBUTED TRACING (OpenTelemetry)                     │
└─────────────────────────────────────────────────────────────────────┘

Jaeger UI: http://localhost:16686

Trace: abc123def456
├─ saga.executeBooking (booking-service) [200ms]
│  ├─ saga.step1.createBooking [50ms]
│  │  └─ db.transaction [45ms]
│  ├─ saga.step2.lockSeats [30ms]
│  │  └─ redis.lockSeats [25ms]
│  ├─ saga.step3.reserveFlightSeats [40ms]
│  │  └─ db.transaction [35ms]
│  └─ outbox.publishEvent [20ms]
│     └─ rabbitmq.publish [15ms]
├─ flight.handleReserveSeats (flight-service) [80ms]
│  ├─ db.transaction [70ms]
│  │  ├─ db.select.for_update [20ms]
│  │  ├─ db.update.flights [30ms]
│  │  └─ db.insert.processed_events [20ms]
│  └─ rabbitmq.ack [5ms]
└─ saga.step6.confirmBooking (booking-service) [60ms]
   ├─ db.transaction [50ms]
   └─ redis.releaseSeats [10ms]

Total Duration: 360ms
Services: booking-service, flight-service
Status: ✓ Success

┌─────────────────────────────────────────────────────────────────────┐
│                    IDEMPOTENCY GUARANTEES                            │
└─────────────────────────────────────────────────────────────────────┘

✓ SAGA LEVEL:
  - Check idempotency_key before starting
  - Each step checks currentStep before executing
  - Same request → Same result

✓ EVENT LEVEL:
  - Each event has unique eventId (UUID)
  - Flight service checks processed_events table
  - Same event → Processed once, ACKed multiple times

✓ API LEVEL:
  - Client sends X-Idempotency-Key header
  - Server checks saga_states for duplicate
  - Same key → Return existing booking

✓ DATABASE LEVEL:
  - Pessimistic locking (FOR UPDATE)
  - Optimistic locking (version column)
  - Transactions ensure ACID

┌─────────────────────────────────────────────────────────────────────┐
│                    MONITORING & ALERTING                             │
└─────────────────────────────────────────────────────────────────────┘

METRICS TO TRACK:
  ✓ Saga completion rate: 99.8%
  ✓ Compensation rate: 0.2%
  ✓ Average saga duration: 350ms
  ✓ Outbox processing lag: < 5s
  ✓ DLQ message count: 0
  ✓ Event processing latency: p50: 80ms, p99: 200ms

ALERTS:
  🚨 Compensation rate > 1%
  🚨 Outbox processing lag > 30s
  🚨 DLQ message count > 0
  🚨 Saga duration p99 > 1s
  🚨 Failed saga count > 10/min

DASHBOARDS:
  📊 Jaeger: Distributed traces
  📊 Grafana: Business metrics
  📊 Prometheus: System metrics
  📊 RabbitMQ Management: Queue depths

┌─────────────────────────────────────────────────────────────────────┐
│                    DATABASE TABLES SUMMARY                           │
└─────────────────────────────────────────────────────────────────────┘

1. saga_states
   ✓ Tracks saga execution state
   ✓ Enables saga recovery on crash
   ✓ Provides audit trail
   ✓ Supports idempotency

2. outbox_events
   ✓ Ensures at-least-once delivery
   ✓ Part of same transaction as business logic
   ✓ Decouples services
   ✓ Enables retry & DLQ

3. processed_events (Flight Service)
   ✓ Prevents duplicate event processing
   ✓ Ensures idempotency
   ✓ Event deduplication

4. bookings
   ✓ Business data
   ✓ Updated by saga steps

5. flights
   ✓ Seat inventory
   ✓ Updated with pessimistic locks

┌─────────────────────────────────────────────────────────────────────┐
│                    PRODUCTION CHECKLIST                              │
└─────────────────────────────────────────────────────────────────────┘

✅ Persist saga state → saga_states table
✅ Use outbox pattern → outbox_events table
✅ Make steps idempotent → processed_events + step checks
✅ Add retry logic → RabbitMQ redelivery
✅ Add DLQ → booking.dlq exchange
✅ Add distributed tracing → OpenTelemetry + Jaeger
✅ Transaction boundaries → Each step in transaction
✅ Error handling → Proper try-catch + compensation
✅ Monitoring → Metrics + Alerts + Dashboards
✅ Documentation → This artifact! 🎉
*/