import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, ManyToOne, OneToMany, JoinColumn, Index } from 'typeorm';
import { City } from './city.entity';
import { Flight } from './flight.entity';

@Entity('airports')
@Index(['code'], { unique: true })
@Index(['cityId'])
export class Airport {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 200, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 3, nullable: false, unique: true })
    code: string;

    @Column({ name: 'icao_code', type: 'varchar', length: 4, nullable: true })
    icaoCode: string;

    @Column({ type: 'text', nullable: true })
    address: string;

    @Column({ type: 'varchar', length: 100, nullable: true })
    city_denormalized: string; // From migration's 'city' column, renamed here to avoid conflict with relation

    @Column({ type: 'varchar', length: 100, nullable: true })
    country_denormalized: string; // From migration's 'country' column

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'varchar', length: 50, nullable: true })
    timezone: string;

    @Column({ name: 'city_id', type: 'int', nullable: false })
    cityId: number;

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @ManyToOne(() => City, (city) => city.airports, { onDelete: 'RESTRICT' })
    @JoinColumn({ name: 'city_id' })
    city: City;

    @OneToMany(() => Flight, (flight) => flight.departureAirport)
    departureFlights: Flight[];

    @OneToMany(() => Flight, (flight) => flight.arrivalAirport)
    arrivalFlights: Flight[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
