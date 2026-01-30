import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    Delete,
    Query,
    HttpStatus,
    ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { MessagePattern, Payload } from '@nestjs/microservices';
import { FlightService } from '../services/flight.service';
import { SharedCreateFlightDto, SharedSearchFlightDto, MessagePattern as MP } from '@app/common';

@ApiTags('Flights Internal')
@Controller('flights-internal')
export class FlightController {
    constructor(private readonly flightService: FlightService) { }

    @Post()
    @ApiBearerAuth()
    async create(@Body() createDto: SharedCreateFlightDto) {
        return this.flightService.create(createDto);
    }

    @Get()
    async search(@Query() searchDto: SharedSearchFlightDto) {
        return this.flightService.search(searchDto);
    }

    @Get(':id')
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.flightService.findOne(id);
    }

    @Delete(':id')
    @ApiBearerAuth()
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.flightService.remove(id);
    }

    // RabbitMQ Handlers
    @MessagePattern(MP.FLIGHT_CREATE)
    handleCreate(@Payload() createDto: SharedCreateFlightDto) {
        return this.flightService.create(createDto);
    }

    @MessagePattern(MP.FLIGHT_SEARCH)
    handleSearch(@Payload() searchDto: SharedSearchFlightDto) {
        return this.flightService.search(searchDto);
    }

    @MessagePattern(MP.FLIGHT_FIND_BY_ID)
    handleFindOne(@Payload() data: { id: number }) {
        return this.flightService.findOne(data.id);
    }

    @MessagePattern(MP.FLIGHT_DELETE)
    handleDelete(@Payload() data: { id: number }) {
        return this.flightService.remove(data.id);
    }
}
