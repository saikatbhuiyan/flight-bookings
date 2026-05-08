import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere, ILike } from 'typeorm';
import { City } from '../../../entities/city.entity';
import { QueryCityDto } from '../dto/query-city.dto';
import { IBaseRepository } from 'apps/flight-service/src/common/interfaces/repository.interface';

type CityWithAirportCount = City & { airportCount: number };

@Injectable()
export class CityRepository implements IBaseRepository<City> {
  private readonly logger = new Logger(CityRepository.name);

  constructor(
    @InjectRepository(City)
    private readonly repository: Repository<City>,
  ) {}

  async findById(id: number, withRelations = false): Promise<City | null> {
    const relations = withRelations ? ['airports'] : [];
    return this.repository.findOne({
      where: { id },
      relations,
    });
  }

  async findAll(where?: FindOptionsWhere<City>): Promise<City[]> {
    return this.repository.find({
      where,
      order: { name: 'ASC' },
    });
  }

  async findWithPagination(skip: number, take: number, where?: FindOptionsWhere<City>): Promise<[City[], number]> {
    return this.repository.findAndCount({
      where,
      skip,
      take,
      order: { name: 'ASC' },
    });
  }

  async search(queryDto: QueryCityDto): Promise<[City[], number]> {
    const { search, country, countryCode, timezone, active, sortBy, sortOrder, page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;
    const take = limit;

    const query = this.repository.createQueryBuilder('city');

    if (search) {
      query.andWhere('(city.name ILIKE :search OR city.country ILIKE :search)', {
        search: `%${search}%`,
      });
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

    const orderField = sortBy || 'name';
    const orderDirection = sortOrder || 'ASC';
    query.orderBy(`city.${orderField}`, orderDirection);

    query.skip(skip).take(take);

    return query.getManyAndCount();
  }

  async findByName(name: string): Promise<City | null> {
    return this.repository.findOne({
      where: { name: ILike(name) },
    });
  }

  async create(data: Partial<City>): Promise<City> {
    const city = this.repository.create(data);
    return this.repository.save(city);
  }

  async update(id: number, data: Partial<City>): Promise<City> {
    await this.repository.update(id, data);
    const updated = await this.findById(id);
    if (!updated) {
      throw new Error('City not found after update');
    }
    return updated;
  }

  async delete(id: number): Promise<boolean> {
    const result = await this.repository.update(id, { active: false });
    return result.affected > 0;
  }

  async hardDelete(id: number): Promise<boolean> {
    const result = await this.repository.delete(id);
    return result.affected > 0;
  }

  async exists(where: FindOptionsWhere<City>): Promise<boolean> {
    const count = await this.repository.count({ where });
    return count > 0;
  }

  async count(where?: FindOptionsWhere<City>): Promise<number> {
    return this.repository.count({ where });
  }

  async findWithAirportCount(
    skip: number,
    take: number,
    where?: FindOptionsWhere<City>,
  ): Promise<[CityWithAirportCount[], number]> {
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

    const transformedResults = results.map((city) => ({
      ...city,
      airportCount: Number((city as City & { airportCount?: string | number }).airportCount || 0),
    })) as CityWithAirportCount[];

    return [transformedResults, total];
  }
}
