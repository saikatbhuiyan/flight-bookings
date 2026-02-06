import { Injectable, Logger, BadRequestException } from '@nestjs/common';
import { SeatRepository } from '../repositories/seat.repository';
import { AirplaneRepository } from '../../airplane/repositories/airplane.repository';
import { CreateSeatDto, BulkCreateSeatsDto, SharedSeatType } from '@app/common';
import { Seat, SeatType } from '../../../entities/seat.entity';

@Injectable()
export class SeatService {
  private readonly logger = new Logger(SeatService.name);

  constructor(
    private readonly seatRepository: SeatRepository,
    private readonly airplaneRepository: AirplaneRepository,
  ) {}

  async create(createSeatDto: CreateSeatDto): Promise<Seat> {
    return this.seatRepository.create({
      ...createSeatDto,
      type: createSeatDto.type as unknown as SeatType,
    });
  }

  async findByAirplane(airplaneId: number): Promise<Seat[]> {
    return this.seatRepository.findByAirplane(airplaneId);
  }

  async bulkCreate(bulkDto: BulkCreateSeatsDto): Promise<Seat[]> {
    const { airplaneId, rows, colsPerRow, type } = bulkDto;

    const airplane = await this.airplaneRepository.findById(airplaneId);
    if (!airplane) {
      throw new BadRequestException(`Airplane with ID ${airplaneId} not found`);
    }

    // Basic column mapping: 1 -> A, 2 -> B, etc.
    const getColLetter = (index: number) => String.fromCharCode(65 + index);

    const seats: Partial<Seat>[] = [];
    for (let r = 1; r <= rows; r++) {
      for (let c = 0; c < colsPerRow; c++) {
        seats.push({
          airplaneId,
          row: r,
          col: getColLetter(c),
          type: type as unknown as SeatType,
        });
      }
    }

    this.logger.log(
      `Bulk creating ${seats.length} seats for airplane ${airplaneId}`,
    );
    return this.seatRepository.bulkCreate(seats);
  }

  async remove(id: number): Promise<void> {
    await this.seatRepository.delete(id);
  }
}
