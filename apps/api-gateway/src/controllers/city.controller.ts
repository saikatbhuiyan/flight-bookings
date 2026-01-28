import {
    Controller,
    Get,
    Post,
    Body,
    Patch,
    Param,
    Delete,
    Query,
    HttpStatus,
    Inject,
    HttpException,
    ParseIntPipe,
    HttpCode,
} from '@nestjs/common';
import { ClientProxy } from '@nestjs/microservices';
import { firstValueFrom } from 'rxjs';
import {
    ApiTags,
    ApiOperation,
    ApiResponse,
    ApiParam,
    ApiBearerAuth,
} from '@nestjs/swagger';
import {
    MessagePattern as MP,
    Public,
    Roles,
    Role,
    CreateCityDto,
    UpdateCityDto,
    QueryCityDto,
} from '@app/common';

/**
 * API Gateway controller for City operations
 * Proxies requests to flight-service via RabbitMQ
 */
@ApiTags('Cities')
@Controller('cities')
export class CityController {
    constructor(
        @Inject('FLIGHT_SERVICE') private readonly flightClient: ClientProxy,
    ) { }

    @Post()
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Create a new city' })
    @ApiResponse({ status: HttpStatus.CREATED, description: 'City created successfully' })
    async create(@Body() createCityDto: CreateCityDto) {
        return this.callService(MP.CITY_CREATE, createCityDto);
    }

    @Get()
    @Public()
    @ApiOperation({ summary: 'Get all cities with pagination' })
    @ApiResponse({ status: HttpStatus.OK, description: 'Cities retrieved successfully' })
    async findAll(@Query() queryDto: QueryCityDto) {
        return this.callService(MP.CITY_FIND_ALL, queryDto);
    }

    @Get('statistics')
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Get city statistics' })
    async getStatistics() {
        return this.callService(MP.CITY_STATISTICS, {});
    }

    @Get(':id')
    @Public()
    @ApiOperation({ summary: 'Get city by ID' })
    @ApiParam({ name: 'id', description: 'City ID' })
    @ApiResponse({ status: HttpStatus.OK, description: 'City retrieved successfully' })
    async findOne(@Param('id', ParseIntPipe) id: number) {
        return this.callService(MP.CITY_FIND_BY_ID, { id });
    }

    @Patch(':id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @ApiOperation({ summary: 'Update city' })
    @ApiParam({ name: 'id', description: 'City ID' })
    async update(
        @Param('id', ParseIntPipe) id: number,
        @Body() updateCityDto: UpdateCityDto,
    ) {
        return this.callService(MP.CITY_UPDATE, { id, updateCityDto });
    }

    @Delete(':id')
    @Roles(Role.ADMIN)
    @ApiBearerAuth()
    @HttpCode(HttpStatus.NO_CONTENT)
    @ApiOperation({ summary: 'Delete city' })
    @ApiParam({ name: 'id', description: 'City ID' })
    async remove(@Param('id', ParseIntPipe) id: number) {
        return this.callService(MP.CITY_DELETE, { id });
    }

    private async callService<T>(pattern: string, data: any): Promise<T> {
        try {
            return await firstValueFrom(this.flightClient.send<T>(pattern, data));
        } catch (error) {
            const rpcError = error as any;
            const status = rpcError.statusCode || rpcError.status || HttpStatus.INTERNAL_SERVER_ERROR;
            const message = rpcError.message || 'Internal server error';
            throw new HttpException(message, status);
        }
    }
}
