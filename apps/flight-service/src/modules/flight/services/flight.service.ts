import { DataSource } from 'typeorm';
import { OnEvent } from '@nestjs/event-emitter';
import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
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
  ) {}

  async create(createDto: SharedCreateFlightDto): Promise<Flight> {
    const { airplaneId, departureAirportId, arrivalAirportId } = createDto;

    const airplane = await this.airplaneRepository.findById(airplaneId);
    if (!airplane) throw new NotFoundException(`Airplane ${airplaneId} not found`);

    const depAirport = await this.airportRepository.findById(departureAirportId);
    if (!depAirport) throw new NotFoundException(`Departure Airport ${departureAirportId} not found`);

    const arrAirport = await this.airportRepository.findById(arrivalAirportId);
    if (!arrAirport) throw new NotFoundException(`Arrival Airport ${arrivalAirportId} not found`);

    return this.flightRepository.create({
      ...createDto,
      departureTime: new Date(createDto.departureTime),
      arrivalTime: new Date(createDto.arrivalTime),
    } as any);
  }

  async search(searchDto: SharedSearchFlightDto): Promise<Flight[]> {
    const flights = await this.flightRepository.search(searchDto);
    console.log('FlightService.search result count:', flights.length);
    if (flights.length > 0) {
      console.log('First flight keys:', Object.keys(flights[0]));
      console.log(
        'First flight airplane keys:',
        flights[0].airplane ? Object.keys(flights[0].airplane) : 'No airplane',
      );
    }
    return flights;
  }

  async findOne(id: number): Promise<Flight> {
    const flight = await this.flightRepository.findById(id);
    if (!flight) throw new NotFoundException(`Flight ${id} not found`);
    return flight;
  }

  async remove(id: number): Promise<void> {
    await this.flightRepository.delete(id);
  }

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
        lock: { mode: 'pessimistic_write' },
      });

      if (!flight) {
        throw new BadRequestException('Flight not found');
      }

      const seatField = this.getSeatField(seatClass);
      const currentAvailable = flight[seatField] as number;

      if (currentAvailable < seatCount) {
        throw new BadRequestException(
          `Not enough ${seatClass} seats available. Requested: ${seatCount}, Available: ${currentAvailable}`,
        );
      }

      await manager.decrement(Flight, { id: flightId }, seatField, seatCount);

      this.logger.log(`Reserved ${seatCount} ${seatClass} seats for booking ${bookingId} on flight ${flightId}`);
    });
  }

  @OnEvent('flight.confirm-seats')
  confirmSeats(payload: { flightId: number; bookingId: string; seatClass: string; seatCount: number }): void {
    const { flightId, bookingId } = payload;

    this.logger.log(`Confirmed seat reservation for booking ${bookingId} on flight ${flightId}`);
  }

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

      await manager.increment(Flight, { id: flightId }, seatField, seatCount);

      this.logger.log(`Released ${seatCount} ${seatClass} seats for booking ${bookingId} on flight ${flightId}`);
    });
  }

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
