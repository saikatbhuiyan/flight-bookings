import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Flight } from './flight.entity';
import { Seat } from './seat.entity';

@Entity('airplanes')
@Index(['model_number'])
@Index(['manufacturer'])
@Index(['registration_number'], { unique: true })
export class Airplane {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ name: 'model_number', type: 'varchar', length: 50, nullable: false })
    modelNumber: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    manufacturer: string;

    @Column({ name: 'registration_number', type: 'varchar', length: 50, nullable: true, unique: true })
    registrationNumber: string;

    @Column({ name: 'total_capacity', type: 'int', nullable: false, default: 0 })
    totalCapacity: number;

    @Column({ name: 'economy_seats', type: 'int', nullable: false, default: 0 })
    economySeats: number;

    @Column({ name: 'business_seats', type: 'int', nullable: false, default: 0 })
    businessSeats: number;

    @Column({ name: 'first_class_seats', type: 'int', nullable: false, default: 0 })
    firstClassSeats: number;

    @Column({ name: 'premium_economy_seats', type: 'int', nullable: false, default: 0 })
    premiumEconomySeats: number;

    @Column({ name: 'year_manufactured', type: 'int', nullable: true })
    yearManufactured: number;

    @Column({ name: 'max_range_km', type: 'int', nullable: true })
    maxRangeKm: number;

    @Column({ name: 'cruising_speed_kmh', type: 'int', nullable: true })
    cruisingSpeedKmh: number;

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @OneToMany(() => Seat, (seat) => seat.airplane, { cascade: true })
    seats: Seat[];

    @OneToMany(() => Flight, (flight) => flight.airplane)
    flights: Flight[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
