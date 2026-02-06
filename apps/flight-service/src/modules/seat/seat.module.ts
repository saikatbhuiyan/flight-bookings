import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Seat } from '../../entities/seat.entity';
import { SeatController } from './controllers/seat.controller';
import { SeatService } from './services/seat.service';
import { SeatRepository } from './repositories/seat.repository';
import { AirplaneModule } from '../airplane/airplane.module';

@Module({
  imports: [TypeOrmModule.forFeature([Seat]), AirplaneModule],
  controllers: [SeatController],
  providers: [SeatService, SeatRepository],
  exports: [SeatService, SeatRepository],
})
export class SeatModule {}
