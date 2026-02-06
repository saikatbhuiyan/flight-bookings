import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { CityRepository } from '../repositories/city.repository';
import { CreateCityDto } from '../dto/create-city.dto';
import { UpdateCityDto } from '../dto/update-city.dto';
import { QueryCityDto } from '../dto/query-city.dto';
import { CityResponseDto } from '../dto/city-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination-response.dto';

/**
 * Service layer for City operations
 * Handles business logic and validation
 * Follows Single Responsibility Principle
 */
@Injectable()
export class CityService {
  private readonly logger = new Logger(CityService.name);

  constructor(private readonly cityRepository: CityRepository) {}

  /**
   * Create a new city
   * Validates uniqueness of city name
   */
  async create(createCityDto: CreateCityDto): Promise<CityResponseDto> {
    this.logger.log(`Creating new city: ${createCityDto.name}`);

    // Check if city already exists
    const existing = await this.cityRepository.findByName(createCityDto.name);
    if (existing) {
      throw new ConflictException(
        `City with name "${createCityDto.name}" already exists`,
      );
    }

    // Validate coordinates if provided
    if (
      createCityDto.latitude !== undefined &&
      createCityDto.longitude === undefined
    ) {
      throw new BadRequestException(
        'Longitude is required when latitude is provided',
      );
    }
    if (
      createCityDto.longitude !== undefined &&
      createCityDto.latitude === undefined
    ) {
      throw new BadRequestException(
        'Latitude is required when longitude is provided',
      );
    }

    const city = await this.cityRepository.create(createCityDto);
    return plainToInstance(CityResponseDto, city, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get all cities with pagination and filters
   */
  async findAll(
    queryDto: QueryCityDto,
  ): Promise<PaginatedResponseDto<CityResponseDto>> {
    this.logger.log('Fetching cities with filters');

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;
    const take = limit;

    const [cities, total] = await this.cityRepository.findWithPagination(
      skip,
      take,
    );

    const cityDtos = cities.map((city) =>
      plainToInstance(CityResponseDto, city, {
        excludeExtraneousValues: true,
      }),
    );

    return PaginatedResponseDto.create(
      cityDtos,
      queryDto.page,
      queryDto.limit,
      total,
    );
  }

  /**
   * Get cities with airport count
   */
  async findAllWithAirportCount(
    queryDto: QueryCityDto,
  ): Promise<PaginatedResponseDto<CityResponseDto>> {
    this.logger.log('Fetching cities with airport count');

    const { page = 1, limit = 10 } = queryDto;
    const skip = (page - 1) * limit;
    const take = limit;

    const [cities, total] = await this.cityRepository.findWithAirportCount(
      skip,
      take,
    );

    const cityDtos = cities.map((city) =>
      plainToInstance(CityResponseDto, city, {
        excludeExtraneousValues: true,
      }),
    );

    return PaginatedResponseDto.create(
      cityDtos,
      queryDto.page,
      queryDto.limit,
      total,
    );
  }

  /**
   * Get city by ID
   */
  async findOne(id: number): Promise<CityResponseDto> {
    this.logger.log(`Fetching city with ID: ${id}`);

    const city = await this.cityRepository.findById(id, true);
    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    const cityDto = plainToInstance(CityResponseDto, city, {
      excludeExtraneousValues: true,
    });

    // Add airport count if airports are loaded
    if (city.airports) {
      cityDto.airportCount = city.airports.length;
    }

    return cityDto;
  }

  /**
   * Update city
   */
  async update(
    id: number,
    updateCityDto: UpdateCityDto,
  ): Promise<CityResponseDto> {
    this.logger.log(`Updating city with ID: ${id}`);

    // Check if city exists
    const existing = await this.cityRepository.findById(id);
    if (!existing) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    // Check name uniqueness if name is being updated
    if (updateCityDto.name && updateCityDto.name !== existing.name) {
      const duplicate = await this.cityRepository.findByName(
        updateCityDto.name,
      );
      if (duplicate) {
        throw new ConflictException(
          `City with name "${updateCityDto.name}" already exists`,
        );
      }
    }

    // Validate coordinates if being updated
    if (
      updateCityDto.latitude !== undefined &&
      updateCityDto.longitude === undefined &&
      !existing.longitude
    ) {
      throw new BadRequestException(
        'Longitude is required when latitude is provided',
      );
    }
    if (
      updateCityDto.longitude !== undefined &&
      updateCityDto.latitude === undefined &&
      !existing.latitude
    ) {
      throw new BadRequestException(
        'Latitude is required when longitude is provided',
      );
    }

    const updated = await this.cityRepository.update(id, updateCityDto);
    return plainToInstance(CityResponseDto, updated, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Soft delete city (set active = false)
   */
  async remove(id: number): Promise<void> {
    this.logger.log(`Soft deleting city with ID: ${id}`);

    const city = await this.cityRepository.findById(id, true);
    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    // Check if city has active airports
    if (city.airports && city.airports.some((airport) => airport.active)) {
      throw new BadRequestException(
        'Cannot delete city with active airports. Deactivate airports first.',
      );
    }

    const deleted = await this.cityRepository.delete(id);
    if (!deleted) {
      throw new BadRequestException(`Failed to delete city with ID ${id}`);
    }
  }

  /**
   * Restore soft-deleted city
   */
  async restore(id: number): Promise<CityResponseDto> {
    this.logger.log(`Restoring city with ID: ${id}`);

    const city = await this.cityRepository.findById(id);
    if (!city) {
      throw new NotFoundException(`City with ID ${id} not found`);
    }

    if (city.active) {
      throw new BadRequestException(`City with ID ${id} is already active`);
    }

    const restored = await this.cityRepository.update(id, { active: true });
    return plainToInstance(CityResponseDto, restored, {
      excludeExtraneousValues: true,
    });
  }

  /**
   * Get city statistics
   */
  async getStatistics() {
    const total = await this.cityRepository.count();
    const active = await this.cityRepository.count({ active: true });
    const inactive = total - active;

    return {
      total,
      active,
      inactive,
    };
  }
}
