import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn, UpdateDateColumn, OneToMany, Index } from 'typeorm';
import { Airport } from './airport.entity';

@Entity('cities')
@Index(['name', 'country'], { unique: true })
export class City {
    @PrimaryGeneratedColumn('increment')
    id: number;

    @Column({ type: 'varchar', length: 100, nullable: false })
    name: string;

    @Column({ type: 'varchar', length: 100, nullable: false })
    country: string;

    @Column({ name: 'country_code', type: 'varchar', length: 10, nullable: true })
    countryCode: string;

    @Column({ type: 'varchar', length: 50, nullable: true })
    timezone: string;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    latitude: number;

    @Column({ type: 'decimal', precision: 10, scale: 7, nullable: true })
    longitude: number;

    @Column({ type: 'boolean', default: true })
    active: boolean;

    @OneToMany(() => Airport, (airport) => airport.city)
    airports: Airport[];

    @CreateDateColumn({ name: 'created_at' })
    createdAt: Date;

    @UpdateDateColumn({ name: 'updated_at' })
    updatedAt: Date;
}
