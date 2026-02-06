import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Airport } from '../../../entities/airport.entity';
import { IBaseRepository } from '../../../common/interfaces/repository.interface';
import { QueryAirportDto } from '../dto/query-airport.dto';

/**
 * Repository for Airport entity
 * Handles all database operations for airports
 */
@Injectable()
export class AirportRepository implements IBaseRepository<Airport> {
  private readonly logger = new Logger(AirportRepository.name);

  constructor(
    @InjectRepository(Airport)
    private readonly repository: Repository<Airport>,
  ) {}

  async findById(id: number, withRelations = true): Promise<Airport | null> {
    const relations = withRelations ? ['city'] : [];
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  async findAll(where?: FindOptionsWhere<Airport>): Promise<Airport[]> {
    return this.repository.find({
      where,
      relations: ['city'],
      order: { name: 'ASC' },
    });
  }

  async findWithPagination(
    skip: number,
    take: number,
    where?: FindOptionsWhere<Airport>,
  ): Promise<[Airport[], number]> {
    return this.repository.findAndCount({
      where,
      relations: ['city'],
      skip,
      take,
      order: { name: 'ASC' },
    });
  }

  async search(queryDto: QueryAirportDto): Promise<[Airport[], number]> {
    const {
      search,
      code,
      icaoCode,
      cityId,
      cityName,
      country,
      active,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = queryDto;
    const skip = (page - 1) * limit;
    const take = limit;

    const query = this.repository
      .createQueryBuilder('airport')
      .leftJoinAndSelect('airport.city', 'city');

    if (search) {
      query.andWhere(
        '(airport.name ILIKE :search OR airport.code ILIKE :search OR city.name ILIKE :search)',
        { search: `%${search}%` },
      );
    }

    if (code) {
      query.andWhere('airport.code = :code', { code: code.toUpperCase() });
    }

    if (icaoCode) {
      query.andWhere('airport.icaoCode = :icaoCode', {
        icaoCode: icaoCode.toUpperCase(),
      });
    }

    if (cityId) {
      query.andWhere('airport.cityId = :cityId', { cityId });
    }

    if (cityName) {
      query.andWhere('city.name ILIKE :cityName', {
        cityName: `%${cityName}%`,
      });
    }

    if (country) {
      query.andWhere('city.country ILIKE :country', {
        country: `%${country}%`,
      });
    }

    if (active !== undefined) {
      query.andWhere('airport.active = :active', { active });
    }

    const orderField = sortBy || 'name';
    const orderDirection = sortOrder || 'ASC';
    query.orderBy(`airport.${orderField}`, orderDirection);

    query.skip(skip).take(take);

    return query.getManyAndCount();
  }

  async findByCode(code: string): Promise<Airport | null> {
    return this.repository.findOne({
      where: { code: code.toUpperCase() },
      relations: ['city'],
    });
  }

  async findByIcaoCode(icaoCode: string): Promise<Airport | null> {
    return this.repository.findOne({
      where: { icaoCode: icaoCode.toUpperCase() },
      relations: ['city'],
    });
  }

  async create(data: Partial<Airport>): Promise<Airport> {
    const airport = this.repository.create(data);
    return this.repository.save(airport);
  }

  async update(id: number, data: Partial<Airport>): Promise<Airport> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new NotFoundException('Airport not found after update');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.update(id, { active: false });
    return result.affected > 0;
  }

  async exists(where: FindOptionsWhere<Airport>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async count(where?: FindOptionsWhere<Airport>): Promise<number> {
    return this.repository.count({ where });
  }
}
