import { Entity, Column, Index } from 'typeorm';
import { BaseEntity } from '@app/common/entities/base.entity';

export enum FlightStatus {
  SCHEDULED = 'scheduled',
  DELAYED = 'delayed',
  CANCELLED = 'cancelled',
  DEPARTED = 'departed',
  ARRIVED = 'arrived',
}

export enum FlightClass {
  ECONOMY = 'economy',
  PREMIUM_ECONOMY = 'premium_economy',
  BUSINESS = 'business',
  FIRST_CLASS = 'first_class',
}

@Entity('flights')
@Index(['flightNumber'], { unique: true })
@Index(['departureAirport', 'arrivalAirport', 'departureTime'])
export class Flight extends BaseEntity {
  @Column({ name: 'flight_number', unique: true })
  flightNumber: string;

  @Column({ name: 'airline_name' })
  airlineName: string;

  @Column({ name: 'airline_code' })
  airlineCode: string;

  @Column({ name: 'departure_airport' })
  departureAirport: string;

  @Column({ name: 'arrival_airport' })
  arrivalAirport: string;

  @Column({ name: 'departure_time', type: 'timestamp' })
  departureTime: Date;

  @Column({ name: 'arrival_time', type: 'timestamp' })
  arrivalTime: Date;

  @Column({ type: 'int', name: 'duration_minutes' })
  durationMinutes: number;

  @Column({
    type: 'enum',
    enum: FlightStatus,
    default: FlightStatus.SCHEDULED,
  })
  status: FlightStatus;

  @Column({ name: 'aircraft_type' })
  aircraftType: string;

  @Column({ type: 'int', name: 'total_seats' })
  totalSeats: number;

  @Column({ type: 'int', name: 'available_seats' })
  availableSeats: number;

  @Column({ type: 'decimal', precision: 10, scale: 2, name: 'base_price' })
  basePrice: number;

  @Column({ type: 'jsonb', name: 'price_by_class' })
  priceByClass: {
    economy: number;
    premium_economy: number;
    business: number;
    first_class: number;
  };

  @Column({ type: 'jsonb', nullable: true })
  amenities?: string[];

  @Column({ type: 'text', nullable: true })
  notes?: string;

  @Column({ name: 'image_url', nullable: true })
  imageUrl?: string;
}
