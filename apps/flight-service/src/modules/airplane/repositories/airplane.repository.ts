import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import { Airplane } from '../../../entities/airplane.entity';
import { IBaseRepository } from '../../../common/interfaces/repository.interface';
import { QueryAirplaneDto } from '@app/common';

@Injectable()
export class AirplaneRepository implements IBaseRepository<Airplane> {
    private readonly logger = new Logger(AirplaneRepository.name);

    constructor(
        @InjectRepository(Airplane)
        private readonly repository: Repository<Airplane>,
    ) { }

    async findById(id: number): Promise<Airplane | null> {
        return this.repository.findOne({ where: { id } });
    }

    async findAll(where?: FindOptionsWhere<Airplane>): Promise<Airplane[]> {
        return this.repository.find({ where, order: { manufacturer: 'ASC', modelNumber: 'ASC' } });
    }

    async findWithPagination(
        skip: number,
        take: number,
        where?: FindOptionsWhere<Airplane>,
    ): Promise<[Airplane[], number]> {
        return this.repository.findAndCount({
            where,
            skip,
            take,
            order: { manufacturer: 'ASC', modelNumber: 'ASC' },
        });
    }

    async search(queryDto: QueryAirplaneDto): Promise<[Airplane[], number]> {
        const { search, manufacturer, modelNumber, registrationNumber, active, sortBy, sortOrder, page = 1, limit = 10 } = queryDto;
        const skip = (page - 1) * limit;
        const take = limit;

        const query = this.repository.createQueryBuilder('airplane');

        if (search) {
            query.andWhere(
                '(airplane.manufacturer ILIKE :search OR airplane.modelNumber ILIKE :search OR airplane.registrationNumber ILIKE :search)',
                { search: `%${search}%` },
            );
        }

        if (manufacturer) {
            query.andWhere('airplane.manufacturer ILIKE :manufacturer', { manufacturer: `%${manufacturer}%` });
        }

        if (modelNumber) {
            query.andWhere('airplane.modelNumber ILIKE :modelNumber', { modelNumber: `%${modelNumber}%` });
        }

        if (registrationNumber) {
            query.andWhere('airplane.registrationNumber ILIKE :registrationNumber', { registrationNumber: `%${registrationNumber}%` });
        }

        if (active !== undefined) {
            query.andWhere('airplane.active = :active', { active });
        }

        const orderField = sortBy || 'manufacturer';
        const orderDirection = sortOrder || 'ASC';
        query.orderBy(`airplane.${orderField}`, orderDirection);

        query.skip(skip).take(take);

        return query.getManyAndCount();
    }

    async create(data: Partial<Airplane>): Promise<Airplane> {
        const airplane = this.repository.create(data);
        return this.repository.save(airplane);
    }

    async update(id: number, data: Partial<Airplane>): Promise<Airplane> {
        await this.repository.update(id, data);
        const updated = await this.findById(id);
        if (!updated) {
            throw new NotFoundException('Airplane not found after update');
        }
        return updated;
    }

    async delete(id: number): Promise<boolean> {
        const result = await this.repository.update(id, { active: false });
        return result.affected > 0;
    }

    async exists(where: FindOptionsWhere<Airplane>): Promise<boolean> {
        const count = await this.repository.count({ where });
        return count > 0;
    }

    async count(where?: FindOptionsWhere<Airplane>): Promise<number> {
        return this.repository.count({ where });
    }
}
