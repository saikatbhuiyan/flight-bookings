import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { City } from '../../../entities/city.entity';
import { QueryCityDto } from '../dto/query-city.dto';
import { IBaseRepository } from 'apps/flight-service/src/common/interfaces/repository.interface';

/**
 * Repository for City entity
 * Handles all database operations for cities
 * Implements IBaseRepository for consistency
 */
@Injectable()
export class CityRepository implements IBaseRepository<City> {
  private readonly logger = new Logger(CityRepository.name);

  constructor(
    @InjectRepository(City)
    private readonly repository: Repository<City>,
  ) {}

  /**
   * Find city by ID with optional relations
   */
  async findById(id: number, withRelations = false): Promise<City | null> {
    const relations = withRelations ? ['airports'] : [];
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  /**
   * Find all cities with optional filters
   */
  async findAll(where?: FindOptionsWhere<City>): Promise<City[]> {
    return this.repository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  /**
   * Find cities with pagination and filters
   */
  async findWithPagination(
    skip: number,
    take: number,
    where?: FindOptionsWhere<City>,
  ): Promise<[City[], number]> {
    return this.repository.findAndCount({
      where,
      skip,
      take,
      order: { name: 'ASC' },
    });
  }

  /**
   * Advanced search with multiple filters
   */
  async search(queryDto: QueryCityDto): Promise<[City[], number]> {
    const {
      search,
      country,
      countryCode,
      timezone,
      active,
      sortBy,
      sortOrder,
      page = 1,
      limit = 10,
    } = queryDto;
    const skip = (page - 1) * limit;
    const take = limit;

    const query = this.repository.createQueryBuilder('city');

    // Apply filters
    if (search) {
      query.andWhere(
        '(city.name ILIKE :search OR city.country ILIKE :search)',
        {
          search: `%${search}%`,
        },
      );
    }

    if (country) {
      query.andWhere('city.country ILIKE :country', {
        country: `%${country}%`,
      });
    }

    if (countryCode) {
      query.andWhere('city.countryCode = :countryCode', { countryCode });
    }

    if (timezone) {
      query.andWhere('city.timezone = :timezone', { timezone });
    }

    if (active !== undefined) {
      query.andWhere('city.active = :active', { active });
    }

    // Apply sorting
    const orderField = sortBy || 'name';
    const orderDirection = sortOrder || 'ASC';
    query.orderBy(`city.${orderField}`, orderDirection);

    // Apply pagination
    query.skip(skip).take(take);

    return query.getManyAndCount();
  }

  /**
   * Find city by name (case-insensitive)
   */
  async findByName(name: string): Promise<City | null> {
    return this.repository.findOne({
      where: { name: ILike(name) },
    });
  }

  /**
   * Create new city
   */
  async create(data: Partial<City>): Promise<City> {
    const city = this.repository.create(data);
    return this.repository.save(city);
  }

  /**
   * Update existing city
   */
  async update(id: number, data: Partial<City>): Promise<City> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('City not found after update');
    }
    return updated;
  }

  /**
   * Soft delete city (set active = false)
   */
  async delete(id: number): Promise<boolean> {
    const result = await this.repository.update(id, { active: false });
    return result.affected > 0;
  }

  /**
   * Hard delete city (permanent removal)
   */
  async hardDelete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  /**
   * Check if city exists
   */
  async exists(where: FindOptionsWhere<City>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  /**
   * Count cities matching criteria
   */
  async count(where?: FindOptionsWhere<City>): Promise<number> {
    return this.repository.count({ where });
  }

  /**
   * Get cities with airport count
   */
  async findWithAirportCount(
    skip: number,
    take: number,
    where?: FindOptionsWhere<City>,
  ): Promise<[any[], number]> {
    const query = this.repository
      .createQueryBuilder('city')
      .leftJoin('city.airports', 'airport')
      .select([
        'city.id',
        'city.name',
        'city.country',
        'city.countryCode',
        'city.timezone',
        'city.latitude',
        'city.longitude',
        'city.active',
        'city.createdAt',
        'city.updatedAt',
      ])
      .addSelect('COUNT(airport.id)', 'airportCount')
      .groupBy('city.id')
      .skip(skip)
      .take(take)
      .orderBy('city.name', 'ASC');

    if (where) {
      query.where(where);
    }

    const [results, total] = await query.getManyAndCount();

    // Transform results to include airportCount
    const transformedResults = results.map((city: any) => ({
      ...city,
      airportCount: parseInt(city.airportCount) || 0,
    }));

    return [transformedResults, total];
  }
}
