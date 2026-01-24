import {
    Controller,
    Get,
    Query,
    Param,
    HttpStatus,
    Inject,
    HttpException,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    MessagePattern as MP,
    ApiResponseDto,
    Public,
    SearchFlightDto,
} from '@app/common';
import { ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('Flights')
@Controller('flights')
export class FlightController {
    constructor(
        @Inject('FLIGHT_SERVICE') private readonly flightClient: ClientProxy,
    ) { }

    @Public()
    @Get()
    @ApiOperation({ summary: 'Search for flights' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns a list of matching flights',
        type: ApiResponseDto,
    })
    async searchFlights(@Query() searchDto: SearchFlightDto) {
        const result = await this.callService(MP.FLIGHT_SEARCH, searchDto);
        return ApiResponseDto.success(result, 'Flights retrieved successfully');
    }

    @Public()
    @Get(':id')
    @ApiOperation({ summary: 'Get flight details by ID' })
    @ApiParam({ name: 'id', description: 'Flight ID (UUID)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns the flight details',
        type: ApiResponseDto,
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Flight not found' })
    async getFlightById(@Param('id') id: string) {
        const result = await this.callService(MP.FLIGHT_FIND_BY_ID, { id });
        return ApiResponseDto.success(result, 'Flight retrieved successfully');
    }

    private async callService<T>(pattern: string, data: any): Promise<T> {
        try {
            return await firstValueFrom(this.flightClient.send<T>(pattern, data));
        } catch (error) {
            const rpcError = error as any;
            console.error(`[Gateway] Error calling ${pattern}:`, rpcError);

            let status = HttpStatus.INTERNAL_SERVER_ERROR;
            if (typeof rpcError.status === 'number') {
                status = rpcError.status;
            } else if (rpcError.statusCode && typeof rpcError.statusCode === 'number') {
                status = rpcError.statusCode;
            }

            let message = 'Internal server error';
            if (typeof rpcError.message === 'string') {
                message = rpcError.message;
            } else if (rpcError.message && typeof rpcError.message === 'object') {
                message = rpcError.message.message || rpcError.message.error || JSON.stringify(rpcError.message);
            }

            throw new HttpException(message, status);
        }
    }
}
