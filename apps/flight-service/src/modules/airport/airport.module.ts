import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Airport } from '../../entities/airport.entity';
import { AirportController } from './controllers/airport.controller';
import { AirportService } from './services/airport.service';
import { AirportRepository } from './repositories/airport.repository';
import { CityModule } from '../city/city.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Airport]),
    CityModule, // Import to access CityRepository
  ],
  controllers: [AirportController],
  providers: [AirportService, AirportRepository],
  exports: [AirportService, AirportRepository],
})
export class AirportModule {}
