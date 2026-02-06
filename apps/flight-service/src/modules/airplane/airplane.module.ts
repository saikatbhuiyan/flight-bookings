import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Airplane } from '../../entities/airplane.entity';
import { AirplaneController } from './controllers/airplane.controller';
import { AirplaneService } from './services/airplane.service';
import { AirplaneRepository } from './repositories/airplane.repository';

@Module({
  imports: [TypeOrmModule.forFeature([Airplane])],
  controllers: [AirplaneController],
  providers: [AirplaneService, AirplaneRepository],
  exports: [AirplaneService, AirplaneRepository],
})
export class AirplaneModule {}
