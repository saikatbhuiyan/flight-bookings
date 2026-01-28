import { Injectable, Logger, NotFoundException } from '@nestjs/common';
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
    ) { }

    async create(createDto: SharedCreateFlightDto): Promise<Flight> {
        const { airplaneId, departureAirportId, arrivalAirportId } = createDto;

        // Validate existence
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
}
