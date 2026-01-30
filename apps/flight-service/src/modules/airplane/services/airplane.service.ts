import {
    Injectable,
    NotFoundException,
    Logger,
} from '@nestjs/common';
import { plainToInstance } from 'class-transformer';
import { AirplaneRepository } from '../repositories/airplane.repository';
import { CreateAirplaneDto, UpdateAirplaneDto, QueryAirplaneDto } from '@app/common';
import { AirplaneResponseDto } from '../dto/airplane-response.dto';
import { PaginatedResponseDto } from '../../../common/dto/pagination-response.dto';

@Injectable()
export class AirplaneService {
    private readonly logger = new Logger(AirplaneService.name);

    constructor(private readonly airplaneRepository: AirplaneRepository) { }

    async create(createAirplaneDto: CreateAirplaneDto): Promise<AirplaneResponseDto> {
        this.logger.log(`Creating new airplane: ${createAirplaneDto.manufacturer} ${createAirplaneDto.modelNumber}`);

        const airplane = await this.airplaneRepository.create(createAirplaneDto);
        return plainToInstance(AirplaneResponseDto, airplane, {
            excludeExtraneousValues: true,
        });
    }

    async findAll(queryDto: QueryAirplaneDto): Promise<PaginatedResponseDto<AirplaneResponseDto>> {
        this.logger.log('Fetching airplanes with filters');

        const [airplanes, total] = await this.airplaneRepository.search(queryDto);

        const airplaneDtos = airplanes.map((airplane) =>
            plainToInstance(AirplaneResponseDto, airplane, {
                excludeExtraneousValues: true,
            }),
        );

        return PaginatedResponseDto.create(
            airplaneDtos,
            queryDto.page,
            queryDto.limit,
            total,
        );
    }

    async findOne(id: number): Promise<AirplaneResponseDto> {
        this.logger.log(`Fetching airplane with ID: ${id}`);

        const airplane = await this.airplaneRepository.findById(id);
        if (!airplane) {
            throw new NotFoundException(`Airplane with ID ${id} not found`);
        }

        return plainToInstance(AirplaneResponseDto, airplane, {
            excludeExtraneousValues: true,
        });
    }

    async update(id: number, updateAirplaneDto: UpdateAirplaneDto): Promise<AirplaneResponseDto> {
        this.logger.log(`Updating airplane with ID: ${id}`);

        const updated = await this.airplaneRepository.update(id, updateAirplaneDto);
        return plainToInstance(AirplaneResponseDto, updated, {
            excludeExtraneousValues: true,
        });
    }

    async remove(id: number): Promise<void> {
        this.logger.log(`Soft deleting airplane with ID: ${id}`);

        const airplane = await this.airplaneRepository.findById(id);
        if (!airplane) {
            throw new NotFoundException(`Airplane with ID ${id} not found`);
        }

        await this.airplaneRepository.delete(id);
    }
}
