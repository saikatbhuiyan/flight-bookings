import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  CreateDateColumn,
  UpdateDateColumn,
  ManyToOne,
  JoinColumn,
  Index,
} from 'typeorm';
import { Airplane } from './airplane.entity';

export enum SeatType {
  ECONOMY = 'ECONOMY',
  BUSINESS = 'BUSINESS',
  FIRST_CLASS = 'FIRST_CLASS',
  PREMIUM_ECONOMY = 'PREMIUM_ECONOMY',
}

@Entity('seats')
@Index(['airplaneId', 'row', 'col'], { unique: true })
export class Seat {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ name: 'airplane_id', type: 'int', nullable: false })
  airplaneId: number;

  @Column({ type: 'int', nullable: false })
  row: number;

  @Column({ type: 'char', length: 1, nullable: false })
  col: string;

  @Column({
    type: 'enum',
    enum: SeatType,
    enumName: 'seat_type',
    default: SeatType.ECONOMY,
  })
  type: SeatType;

  @ManyToOne(() => Airplane, (airplane) => airplane.seats, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'airplane_id' })
  airplane: Airplane;

  @CreateDateColumn({ name: 'created_at' })
  createdAt: Date;

  @UpdateDateColumn({ name: 'updated_at' })
  updatedAt: Date;
}
