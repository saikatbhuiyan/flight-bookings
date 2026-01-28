import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, JoinColumn, Index, Check, VersionColumn } from 'typeorm';
import { FlightStatus } from '../../../../libs/common/src/enums/flight.enum';
import { Airplane } from './airplane.entity';
import { Airport } from './airport.entity';

@Entity('flights')
@Index(['flightNumber'])
@Index(['departureAirportId', 'departureTime'])
@Index(['arrivalAirportId', 'arrivalTime'])
@Index(['status'])
@Check(`"departure_time" < "arrival_time"`)
@Check(`"departure_airport_id" != "arrival_airport_id"`)
export class Flight {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'flight_number', type: 'varchar', length: 20, nullable: false })
  flightNumber: string;

  @Column({ name: 'airplane_id', type: 'int', nullable: false })
  airplaneId: number;

  @Column({ name: 'departure_airport_id', type: 'int', nullable: false })
  departureAirportId: number;

  @Column({ name: 'arrival_airport_id', type: 'int', nullable: false })
  arrivalAirportId: number;

  @Column({ name: 'departure_time', type: 'timestamp with time zone', nullable: false })
  departureTime: Date;

  @Column({ name: 'arrival_time', type: 'timestamp with time zone', nullable: false })
  arrivalTime: Date;

  @Column({ name: 'boarding_gate', type: 'varchar', length: 10, nullable: true })
  boardingGate: string;

  @Column({ type: 'varchar', length: 10, nullable: true })
  terminal: string;

  @Column({ name: 'economy_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  economyPrice: number;

  @Column({ name: 'business_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  businessPrice: number;

  @Column({ name: 'first_class_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  firstClassPrice: number;

  @Column({ name: 'premium_economy_price', type: 'decimal', precision: 10, scale: 2, nullable: false })
  premiumEconomyPrice: number;

  @Column({ name: 'economy_seats_available', type: 'int', nullable: false })
  economySeatsAvailable: number;

  @Column({ name: 'business_seats_available', type: 'int', nullable: false })
  businessSeatsAvailable: number;

  @Column({ name: 'first_class_seats_available', type: 'int', nullable: false })
  firstClassSeatsAvailable: number;

  @Column({ name: 'premium_economy_seats_available', type: 'int', nullable: false })
  premiumEconomySeatsAvailable: number;

  @Column({
    type: 'enum',
    enum: FlightStatus,
    default: FlightStatus.SCHEDULED,
    nullable: false,
  })
  status: FlightStatus;

  @VersionColumn()
  version: number;

  @ManyToOne(() => Airplane, (airplane) => airplane.flights, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'airplane_id' })
  airplane: Airplane;

  @ManyToOne(() => Airport, (airport) => airport.departureFlights, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'departure_airport_id' })
  departureAirport: Airport;

  @ManyToOne(() => Airport, (airport) => airport.arrivalFlights, { onDelete: 'RESTRICT' })
  @JoinColumn({ name: 'arrival_airport_id' })
  arrivalAirport: Airport;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
