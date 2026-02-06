import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Seat } from '../../../entities/seat.entity';
import { IBaseRepository } from '../../../common/interfaces/repository.interface';

@Injectable()
export class SeatRepository {
  private readonly logger = new Logger(SeatRepository.name);

  constructor(
    @InjectRepository(Seat)
    private readonly repository: Repository<Seat>,
  ) {}

  async findById(id: number): Promise<Seat | null> {
    return this.repository.findOne({ where: { id }, relations: ['airplane'] });
  }

  async findByAirplane(airplaneId: number): Promise<Seat[]> {
    return this.repository.find({
      where: { airplaneId },
      order: { row: 'ASC', col: 'ASC' },
    });
  }

  async create(data: Partial<Seat>): Promise<Seat> {
    const seat = this.repository.create(data);
    return this.repository.save(seat);
  }

  async bulkCreate(seats: Partial<Seat>[]): Promise<Seat[]> {
    return this.repository.save(seats);
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async deleteByAirplane(airplaneId: number): Promise<void> {
    await this.repository.delete({ airplaneId });
  }
}
