import { DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { FlightRepository } from '../repositories/flight.repository';
import { AirplaneRepository } from '../../airplane/repositories/airplane.repository';
import { AirportRepository } from '../../airport/repositories/airport.repository';
import { SharedCreateFlightDto, SharedSearchFlightDto } from '@app/common';
import { Flight } from '../../../entities/flight.entity';

@Injectable()
export class FlightService {
  private readonly logger = new Logger(FlightService.name);

  constructor(
    private readonly flightRepository: FlightRepository,
    private readonly airplaneRepository: AirplaneRepository,
    private readonly airportRepository: AirportRepository,
    private readonly dataSource: DataSource,
  ) { }

  async create(createDto: SharedCreateFlightDto): Promise<Flight> {
    const { airplaneId, departureAirportId, arrivalAirportId } = createDto;

    // Validate existence
    const airplane = await this.airplaneRepository.findById(airplaneId);
    if (!airplane)
      throw new NotFoundException(`Airplane ${airplaneId} not found`);

    const depAirport =
      await this.airportRepository.findById(departureAirportId);
    if (!depAirport)
      throw new NotFoundException(
        `Departure Airport ${departureAirportId} not found`,
      );

    const arrAirport = await this.airportRepository.findById(arrivalAirportId);
    if (!arrAirport)
      throw new NotFoundException(
        `Arrival Airport ${arrivalAirportId} not found`,
      );

    return this.flightRepository.create({
      ...createDto,
      departureTime: new Date(createDto.departureTime),
      arrivalTime: new Date(createDto.arrivalTime),
    } as any);
  }

  async search(searchDto: SharedSearchFlightDto): Promise<Flight[]> {
    return this.flightRepository.search(searchDto);
  }

  async findOne(id: number): Promise<Flight> {
    const flight = await this.flightRepository.findById(id);
    if (!flight) throw new NotFoundException(`Flight ${id} not found`);
    return flight;
  }

  async remove(id: number): Promise<void> {
    await this.flightRepository.delete(id);
  }

  /**
   * Reserve seats (soft reservation during checkout)
   * This decrements available seats but can be rolled back
   */
  @OnEvent('flight.reserve-seats')
  async reserveSeats(payload: {
    flightId: number;
    bookingId: string;
    seatClass: string;
    seatCount: number;
  }): Promise<void> {
    const { flightId, bookingId, seatClass, seatCount } = payload;

    await this.dataSource.transaction(async (manager) => {
      const flight = await manager.findOne(Flight, {
        where: { id: flightId },
        lock: { mode: 'pessimistic_write' }, // Row-level lock
      });

      if (!flight) {
        throw new BadRequestException('Flight not found');
      }

      // Determine which seat column to update
      const seatField = this.getSeatField(seatClass);
      const currentAvailable = flight[seatField] as number;

      if (currentAvailable < seatCount) {
        throw new BadRequestException(
          `Not enough ${seatClass} seats available. Requested: ${seatCount}, Available: ${currentAvailable}`,
        );
      }

      // Decrement available seats
      await manager.decrement(Flight, { id: flightId }, seatField, seatCount);

      this.logger.log(
        `Reserved ${seatCount} ${seatClass} seats for booking ${bookingId} on flight ${flightId}`,
      );
    });
  }

  /**
   * Confirm seats (permanent - after payment)
   * No changes needed as seats were already reserved
   */
  @OnEvent('flight.confirm-seats')
  confirmSeats(payload: {
    flightId: number;
    bookingId: string;
    seatClass: string;
    seatCount: number;
  }): void {
    const { flightId, bookingId } = payload;

    // Seats already decremented during reserve step
    // This event just confirms the reservation is permanent
    this.logger.log(
      `Confirmed seat reservation for booking ${bookingId} on flight ${flightId}`,
    );
  }

  /**
   * Release seats (compensation - on booking failure or cancellation)
   * This increments available seats back
   */
  @OnEvent('flight.release-seats')
  async releaseSeats(payload: {
    flightId: number;
    bookingId: string;
    seatClass: string;
    seatCount: number;
  }): Promise<void> {
    const { flightId, bookingId, seatClass, seatCount } = payload;

    await this.dataSource.transaction(async (manager) => {
      const seatField = this.getSeatField(seatClass);

      // Increment available seats
      await manager.increment(Flight, { id: flightId }, seatField, seatCount);

      this.logger.log(
        `Released ${seatCount} ${seatClass} seats for booking ${bookingId} on flight ${flightId}`,
      );
    });
  }

  /**
   * Map seat class to database column
   */
  private getSeatField(seatClass: string): keyof Flight {
    const mapping = {
      ECONOMY: 'economySeatsAvailable',
      BUSINESS: 'businessSeatsAvailable',
      FIRST_CLASS: 'firstClassSeatsAvailable',
      PREMIUM_ECONOMY: 'premiumEconomySeatsAvailable',
    };

    const field = mapping[seatClass];
    if (!field) {
      throw new BadRequestException(`Invalid seat class: ${seatClass}`);
    }

    return field as keyof Flight;
  }
}
