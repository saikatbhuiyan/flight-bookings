import {
    Injectable,
    NotFoundException,
    ConflictException,
    BadRequestException,
    Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AirportRepository } from '../repositories/airport.repository';
import { CityRepository } from '../../city/repositories/city.repository';
import { CreateAirportDto } from '../dto/create-airport.dto';
import { UpdateAirportDto } from '../dto/update-airport.dto';
import { QueryAirportDto } from '../dto/query-airport.dto';
import { AirportResponseDto } from '../dto/airport-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination-response.dto';

/**
 * Service layer for Airport operations
 */
@Injectable()
export class AirportService {
    private readonly logger = new Logger(AirportService.name);

    constructor(
        private readonly airportRepository: AirportRepository,
        private readonly cityRepository: CityRepository,
    ) { }

    async create(createAirportDto: CreateAirportDto): Promise<AirportResponseDto> {
        this.logger.log(`Creating new airport: ${createAirportDto.name}`);

        // Validate city exists
        const city = await this.cityRepository.findById(createAirportDto.cityId);
        if (!city) {
            throw new NotFoundException(`City with ID ${createAirportDto.cityId} not found`);
        }

        // Check IATA code uniqueness
        const existingByCode = await this.airportRepository.findByCode(createAirportDto.code);
        if (existingByCode) {
            throw new ConflictException(`Airport with code "${createAirportDto.code}" already exists`);
        }

        // Check ICAO code uniqueness if provided
        if (createAirportDto.icaoCode) {
            const existingByIcao = await this.airportRepository.findByIcaoCode(createAirportDto.icaoCode);
            if (existingByIcao) {
                throw new ConflictException(
                    `Airport with ICAO code "${createAirportDto.icaoCode}" already exists`,
                );
            }
        }

        const airport = await this.airportRepository.create({
            ...createAirportDto,
            code: createAirportDto.code.toUpperCase(),
            icaoCode: createAirportDto.icaoCode?.toUpperCase(),
        });

        return plainToInstance(AirportResponseDto, airport, {
            excludeExtraneousValues: true,
        });
    }

    async findAll(queryDto: QueryAirportDto): Promise<PaginatedResponseDto<AirportResponseDto>> {
        this.logger.log('Fetching airports with filters');

        const [airports, total] = await this.airportRepository.search(queryDto);

        const airportDtos = airports.map((airport) =>
            plainToInstance(AirportResponseDto, airport, {
                excludeExtraneousValues: true,
            }),
        );

        return PaginatedResponseDto.create(
            airportDtos,
            queryDto.page,
            queryDto.limit,
            total,
        );
    }

    async findOne(id: number): Promise<AirportResponseDto> {
        this.logger.log(`Fetching airport with ID: ${id}`);

        const airport = await this.airportRepository.findById(id);
        if (!airport) {
            throw new NotFoundException(`Airport with ID ${id} not found`);
        }

        return plainToInstance(AirportResponseDto, airport, {
            excludeExtraneousValues: true,
        });
    }

    async findByCode(code: string): Promise<AirportResponseDto> {
        const airport = await this.airportRepository.findByCode(code);
        if (!airport) {
            throw new NotFoundException(`Airport with code "${code}" not found`);
        }

        return plainToInstance(AirportResponseDto, airport, {
            excludeExtraneousValues: true,
        });
    }

    async update(id: number, updateAirportDto: UpdateAirportDto): Promise<AirportResponseDto> {
        this.logger.log(`Updating airport with ID: ${id}`);

        const existing = await this.airportRepository.findById(id);
        if (!existing) {
            throw new NotFoundException(`Airport with ID ${id} not found`);
        }

        // Validate city if being updated
        if (updateAirportDto.cityId && updateAirportDto.cityId !== existing.cityId) {
            const city = await this.cityRepository.findById(updateAirportDto.cityId);
            if (!city) {
                throw new NotFoundException(`City with ID ${updateAirportDto.cityId} not found`);
            }
        }

        // Check code uniqueness if being updated
        if (updateAirportDto.code && updateAirportDto.code !== existing.code) {
            const duplicate = await this.airportRepository.findByCode(updateAirportDto.code);
            if (duplicate) {
                throw new ConflictException(`Airport with code "${updateAirportDto.code}" already exists`);
            }
        }

        const updated = await this.airportRepository.update(id, {
            ...updateAirportDto,
            code: updateAirportDto.code?.toUpperCase(),
            icaoCode: updateAirportDto.icaoCode?.toUpperCase(),
        });

        return plainToInstance(AirportResponseDto, updated, {
            excludeExtraneousValues: true,
        });
    }

    async remove(id: number): Promise<void> {
        this.logger.log(`Soft deleting airport with ID: ${id}`);

        const airport = await this.airportRepository.findById(id);
        if (!airport) {
            throw new NotFoundException(`Airport with ID ${id} not found`);
        }

        const deleted = await this.airportRepository.delete(id);
        if (!deleted) {
            throw new BadRequestException(`Failed to delete airport with ID ${id}`);
        }
    }

    async getStatistics() {
        const total = await this.airportRepository.count();
        const active = await this.airportRepository.count({ active: true });

        return {
            total,
            active,
            inactive: total - active,
        };
    }
}
