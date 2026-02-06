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
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import {
  MessagePattern as MP,
  Public,
  Roles,
  Role,
  CreateAirplaneDto,
  UpdateAirplaneDto,
  QueryAirplaneDto,
} from '@app/common';

@ApiTags('Airplanes')
@Controller('airplanes')
export class AirplaneController {
  constructor(
    @Inject('FLIGHT_SERVICE') private readonly flightClient: ClientProxy,
  ) {}

  @Post()
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Create a new airplane' })
  async create(@Body() createAirplaneDto: CreateAirplaneDto) {
    return this.callService(MP.AIRPLANE_CREATE, createAirplaneDto);
  }

  @Get()
  @Public()
  @ApiOperation({ summary: 'Get all airplanes with pagination' })
  async findAll(@Query() queryDto: QueryAirplaneDto) {
    return this.callService(MP.AIRPLANE_FIND_ALL, queryDto);
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Get airplane by ID' })
  async findOne(@Param('id', ParseIntPipe) id: number) {
    return this.callService(MP.AIRPLANE_FIND_BY_ID, { id });
  }

  @Patch(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update airplane' })
  async update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateAirplaneDto: UpdateAirplaneDto,
  ) {
    return this.callService(MP.AIRPLANE_UPDATE, { id, updateAirplaneDto });
  }

  @Delete(':id')
  @Roles(Role.ADMIN)
  @ApiBearerAuth()
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Delete airplane' })
  async remove(@Param('id', ParseIntPipe) id: number) {
    return this.callService(MP.AIRPLANE_DELETE, { id });
  }

  private async callService<T>(pattern: string, data: any): Promise<T> {
    try {
      return await firstValueFrom(this.flightClient.send<T>(pattern, data));
    } catch (error) {
      const rpcError = error;
      const status =
        rpcError.statusCode ||
        rpcError.status ||
        HttpStatus.INTERNAL_SERVER_ERROR;
      const message = rpcError.message || 'Internal server error';
      throw new HttpException(message, status);
    }
  }
}
