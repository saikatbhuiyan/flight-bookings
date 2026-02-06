import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { City } from '../../entities/city.entity';
import { CityController } from './controllers/city.controller';
import { CityService } from './services/city.service';
import { CityRepository } from './repositories/city.repository';

/**
 * City Module
 * Encapsulates all city-related functionality
 */
@Module({
  imports: [TypeOrmModule.forFeature([City])],
  controllers: [CityController],
  providers: [CityService, CityRepository],
  exports: [CityService, CityRepository],
})
export class CityModule {}
