import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { DatabaseModule } from '@app/database';
import { HealthModule } from '@app/common';
import { Booking } from './entities/booking.entity';
import { BookingServiceController } from './booking-service.controller';
import { BookingServiceService } from './booking-service.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env',
    }),
    DatabaseModule.forRoot([Booking]),
    TypeOrmModule.forFeature([Booking]),
    HealthModule,
  ],
  controllers: [BookingServiceController],
  providers: [BookingServiceService],
})
export class BookingServiceModule { }
