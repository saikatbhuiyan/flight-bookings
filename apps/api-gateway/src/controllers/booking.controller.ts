import {
    Controller,
    Get,
    Post,
    Body,
    Param,
    HttpStatus,
    Inject,
    HttpException,
    UseGuards,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    MessagePattern as MP,
    ApiResponseDto,
    CreateBookingDto,
    CurrentUser,
} from '@app/common';
import { ApiBearerAuth, ApiOperation, ApiResponse, ApiTags, ApiParam } from '@nestjs/swagger';
import { JwtAuthGuard } from '../guards/jwt-auth.guard';

@ApiTags('Bookings')
@Controller('bookings')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth('JWT-auth')
export class BookingController {
    constructor(
        @Inject('BOOKING_SERVICE') private readonly bookingClient: ClientProxy,
    ) { }

    @Post()
    @ApiOperation({ summary: 'Create a new flight booking' })
    @ApiResponse({
        status: HttpStatus.CREATED,
        description: 'Booking created successfully',
        type: ApiResponseDto,
    })
    async createBooking(@Body() createDto: CreateBookingDto, @CurrentUser() user: any) {
        const result = await this.callService(MP.BOOKING_CREATE, {
            ...createDto,
            userId: user.id,
        });
        return ApiResponseDto.success(result, 'Booking created successfully');
    }

    @Get(':id')
    @ApiOperation({ summary: 'Get booking details by ID' })
    @ApiParam({ name: 'id', description: 'Booking ID (UUID)' })
    @ApiResponse({
        status: HttpStatus.OK,
        description: 'Returns the booking details',
        type: ApiResponseDto,
    })
    @ApiResponse({ status: HttpStatus.NOT_FOUND, description: 'Booking not found' })
    async getBookingById(@Param('id') id: string) {
        const result = await this.callService(MP.BOOKING_FIND_BY_ID, { id });
        return ApiResponseDto.success(result, 'Booking retrieved successfully');
    }

    private async callService<T>(pattern: string, data: any): Promise<T> {
        try {
            return await firstValueFrom(this.bookingClient.send<T>(pattern, data));
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
