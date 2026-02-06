import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Flight } from '../../../entities/flight.entity';
import { IBaseRepository } from '../../../common/interfaces/repository.interface';
import { SharedSearchFlightDto } from '@app/common';

@Injectable()
export class FlightRepository implements IBaseRepository<Flight, number> {
  private readonly logger = new Logger(FlightRepository.name);

  constructor(
    @InjectRepository(Flight)
    private readonly repository: Repository<Flight>,
  ) {}

  async findById(id: number): Promise<Flight | null> {
    return this.repository.findOne({
      where: { id },
      relations: ['airplane', 'departureAirport', 'arrivalAirport'],
    });
  }

  async findAll(where?: FindOptionsWhere<Flight>): Promise<Flight[]> {
    return this.repository.find({
      where,
      relations: ['airplane', 'departureAirport', 'arrivalAirport'],
    });
  }

  async findWithPagination(
    skip: number,
    take: number,
    where?: FindOptionsWhere<Flight>,
  ): Promise<[Flight[], number]> {
    return this.repository.findAndCount({
      where,
      relations: ['airplane', 'departureAirport', 'arrivalAirport'],
      skip,
      take,
      order: { departureTime: 'ASC' },
    });
  }

  async search(searchDto: SharedSearchFlightDto): Promise<Flight[]> {
    const { departureAirport, arrivalAirport, date } = searchDto;

    const query = this.repository
      .createQueryBuilder('flight')
      .leftJoinAndSelect('flight.airplane', 'airplane')
      .leftJoinAndSelect('flight.departureAirport', 'departure')
      .leftJoinAndSelect('flight.arrivalAirport', 'arrival');

    if (departureAirport) {
      query.andWhere('departure.code = :dep', {
        dep: departureAirport.toUpperCase(),
      });
    }

    if (arrivalAirport) {
      query.andWhere('arrival.code = :arr', {
        arr: arrivalAirport.toUpperCase(),
      });
    }

    if (date) {
      const startOfDay = new Date(date);
      startOfDay.setUTCHours(0, 0, 0, 0);
      const endOfDay = new Date(date);
      endOfDay.setUTCHours(23, 59, 59, 999);
      query.andWhere('flight.departureTime BETWEEN :start AND :end', {
        start: startOfDay,
        end: endOfDay,
      });
    }

    return query.getMany();
  }

  async create(data: Partial<Flight>): Promise<Flight> {
    const flight = this.repository.create(data);
    return this.repository.save(flight);
  }

  async update(id: number, data: Partial<Flight>): Promise<Flight> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException(`Flight with ID ${id} not found`);
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.update(id, {
      status: 'CANCELLED' as any,
    });
    return result.affected > 0;
  }

  async exists(where: FindOptionsWhere<Flight>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async count(where?: FindOptionsWhere<Flight>): Promise<number> {
    return this.repository.count({ where });
  }
}
