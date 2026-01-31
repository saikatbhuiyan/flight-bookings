import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, LessThan, In } from 'typeorm';
import { Booking, BookingStatus } from '../entities/booking.entity';

@Injectable()
export class BookingRepository {
    constructor(
        @InjectRepository(Booking)
        private readonly repository: Repository<Booking>,
    ) { }

    async findByUserId(userId: number): Promise<Booking[]> {
        return this.repository.find({
            where: { userId },
            order: { createdAt: 'DESC' },
        });
    }

    async findActiveBookingsByUserId(userId: number): Promise<Booking[]> {
        return this.repository.find({
            where: {
                userId,
                status: In([BookingStatus.INITIATED, BookingStatus.PENDING, BookingStatus.BOOKED]),
            },
            order: { departureTime: 'ASC' },
        });
    }

    async findByFlightId(flightId: number): Promise<Booking[]> {
        return this.repository.find({
            where: {
                flightId,
                status: In([BookingStatus.BOOKED, BookingStatus.PENDING]),
            },
        });
    }

    async findExpiredBookings(): Promise<Booking[]> {
        return this.repository.find({
            where: {
                status: BookingStatus.INITIATED,
                expiresAt: LessThan(new Date()),
            },
        });
    }

    async findByReference(bookingReference: string): Promise<Booking | null> {
        return this.repository.findOne({
            where: { bookingReference },
        });
    }

    async create(bookingData: Partial<Booking>): Promise<Booking> {
        const booking = this.repository.create(bookingData);
        return this.repository.save(booking);
    }

    async update(id: number, updateData: Partial<Booking>): Promise<Booking> {
        await this.repository.update(id, updateData);
        return this.repository.findOne({ where: { id } });
    }

    async updateWithVersion(
        id: number,
        version: number,
        updateData: Partial<Booking>,
    ): Promise<Booking | null> {
        const result = await this.repository
            .createQueryBuilder()
            .update(Booking)
            .set(updateData)
            .where('id = :id AND version = :version', { id, version })
            .returning('*')
            .execute();

        return result.raw[0] || null;
    }

    // Get bookings with specific seat numbers
    async findBySeats(flightId: number, seatNumbers: string[]): Promise<Booking[]> {
        return this.repository
            .createQueryBuilder('booking')
            .where('booking.flight_id = :flightId', { flightId })
            .andWhere('booking.seat_numbers && :seatNumbers', { seatNumbers })
            .andWhere('booking.status IN (:...statuses)', {
                statuses: [BookingStatus.BOOKED, BookingStatus.PENDING],
            })
            .getMany();
    }

    // Check if seats are already booked
    async areSeatsAvailable(flightId: number, seatNumbers: string[]): Promise<boolean> {
        const count = await this.repository
            .createQueryBuilder('booking')
            .where('booking.flight_id = :flightId', { flightId })
            .andWhere('booking.seat_numbers && :seatNumbers', { seatNumbers })
            .andWhere('booking.status IN (:...statuses)', {
                statuses: [BookingStatus.BOOKED, BookingStatus.PENDING],
            })
            .getCount();

        return count === 0;
    }
}
