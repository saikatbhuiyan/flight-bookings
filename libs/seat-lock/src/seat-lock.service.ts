import { RedisService } from '@app/common';
import { Injectable, Logger } from '@nestjs/common';

export interface SeatLockResult {
  success: boolean;
  lockedSeats: string[];
  failedSeats: string[];
  lockKey: string;
  expiresAt: Date;
}

@Injectable()
export class SeatLockService {
  private readonly logger = new Logger(SeatLockService.name);

  private readonly LOCK_TTL = 900; // 15 minutes

  constructor(private readonly redisService: RedisService) {}

  async lockSeats(
    flightId: number,
    seats: string[],
    bookingId: string,
    userId: number,
  ): Promise<SeatLockResult> {
    const redis = this.redisService.getClient();
    const timestamp = Date.now();

    // ------------------------------------------
    // 1. Seat validation (DB or cache hook)
    // ------------------------------------------
    await this.validateSeatsExist(flightId, seats);

    // ------------------------------------------
    // 2. Idempotency check
    // ------------------------------------------
    const bookingKey = this.getBookingKey(flightId, bookingId);
    const existing = await redis.get(bookingKey);

    if (existing) {
      const parsed = JSON.parse(existing);
      this.logger.warn(`Idempotent booking lock reuse ${bookingId}`);

      return {
        success: true,
        lockedSeats: parsed.seats,
        failedSeats: [],
        lockKey: bookingKey,
        expiresAt: new Date(parsed.timestamp + this.LOCK_TTL * 1000),
      };
    }

    const expiresAt = new Date(timestamp + this.LOCK_TTL * 1000);

    // ------------------------------------------
    // 3. Cluster-safe Lua script
    // ------------------------------------------
    const luaScript = `
            local flight_id = ARGV[1]
            local booking_id = ARGV[2]
            local user_id = ARGV[3]
            local ttl = tonumber(ARGV[4])
            local timestamp = tonumber(ARGV[5])

            local locked_seats = {}
            local failed_seats = {}
            local all_available = true

            -- Validate availability
            for i = 6, #ARGV do
                local seat = ARGV[i]
                local key = "seat:lock:{" .. flight_id .. "}:" .. seat

                local existing = redis.call('GET', key)

                if existing ~= false then
                    local lock_data = cjson.decode(existing)

                    if lock_data.bookingId ~= booking_id and lock_data.expiresAt > timestamp then
                        all_available = false
                        table.insert(failed_seats, seat)
                    end
                end
            end

            if all_available then
                for i = 6, #ARGV do
                    local seat = ARGV[i]
                    local key = "seat:lock:{" .. flight_id .. "}:" .. seat

                    local lock_data = cjson.encode({
                        flightId = flight_id,
                        seat = seat,
                        bookingId = booking_id,
                        userId = user_id,
                        lockedAt = timestamp,
                        expiresAt = timestamp + (ttl * 1000)
                    })

                    redis.call('SETEX', key, ttl, lock_data)
                    table.insert(locked_seats, seat)
                end

                local booking_key = "seat:lock:booking:{" .. flight_id .. "}:" .. booking_id

                redis.call('SETEX', booking_key, ttl, cjson.encode({
                    flightId = flight_id,
                    seats = locked_seats,
                    userId = user_id,
                    timestamp = timestamp
                }))

                return {1, cjson.encode(locked_seats), cjson.encode({})}
            else
                return {0, cjson.encode({}), cjson.encode(failed_seats)}
            end
        `;

    const result = (await redis.eval(
      luaScript,
      0,
      flightId.toString(),
      bookingId,
      userId.toString(),
      this.LOCK_TTL.toString(),
      timestamp.toString(),
      ...seats,
    )) as [number, string, string];

    const [success, lockedSeatsJson, failedSeatsJson] = result;

    const lockedSeats = JSON.parse(lockedSeatsJson);
    const failedSeats = JSON.parse(failedSeatsJson);

    if (success === 1) {
      this.logger.log(`Locked ${lockedSeats.length} seats for ${bookingId}`);

      return {
        success: true,
        lockedSeats,
        failedSeats: [],
        lockKey: bookingKey,
        expiresAt,
      };
    }

    return {
      success: false,
      lockedSeats: [],
      failedSeats,
      lockKey: '',
      expiresAt: new Date(),
    };
  }

  // =============================================
  // RELEASE LOCKS (Ownership Safe)
  // =============================================

  async releaseSeats(flightId: number, bookingId: string): Promise<void> {
    const redis = this.redisService.getClient();

    const bookingKey = this.getBookingKey(flightId, bookingId);
    const bookingData = await redis.get(bookingKey);

    if (!bookingData) return;

    const parsed = JSON.parse(bookingData);

    const pipeline = redis.pipeline();

    parsed.seats.forEach((seat: string) => {
      pipeline.del(this.getSeatKey(flightId, seat));
    });

    pipeline.del(bookingKey);

    await pipeline.exec();

    this.logger.log(`Released seats for booking ${bookingId}`);
  }

  // =============================================
  // EXTEND LOCK (Fixed TTL Extension)
  // =============================================

  async extendLock(
    flightId: number,
    bookingId: string,
    additionalSeconds = 300,
  ): Promise<boolean> {
    const redis = this.redisService.getClient();
    const bookingKey = this.getBookingKey(flightId, bookingId);

    const bookingData = await redis.get(bookingKey);
    if (!bookingData) return false;

    const parsed = JSON.parse(bookingData);

    const pipeline = redis.pipeline();

    for (const seat of parsed.seats) {
      const seatKey = this.getSeatKey(flightId, seat);
      const ttl = await redis.ttl(seatKey);

      if (ttl > 0) {
        pipeline.expire(seatKey, ttl + additionalSeconds);
      }
    }

    const bookingTTL = await redis.ttl(bookingKey);
    if (bookingTTL > 0) {
      pipeline.expire(bookingKey, bookingTTL + additionalSeconds);
    }

    await pipeline.exec();

    return true;
  }

  // =============================================
  // CHECK LOCK STATUS
  // =============================================

  async areSeatsLocked(
    flightId: number,
    seats: string[],
  ): Promise<Map<string, boolean>> {
    const redis = this.redisService.getClient();
    const pipeline = redis.pipeline();

    seats.forEach((seat) => {
      pipeline.get(this.getSeatKey(flightId, seat));
    });

    const responses = await pipeline.exec();

    const result = new Map<string, boolean>();

    seats.forEach((seat, i) => {
      result.set(seat, responses[i][1] !== null);
    });

    return result;
  }

  // =============================================
  // HELPER METHODS
  // =============================================

  private getSeatKey(flightId: number, seat: string) {
    return `seat:lock:{${flightId}}:${seat}`;
  }

  private getBookingKey(flightId: number, bookingId: string) {
    return `seat:lock:booking:{${flightId}}:${bookingId}`;
  }

  // ---------------------------------------------
  // Seat validation hook
  // Replace with DB or seat service
  // ---------------------------------------------
  private async validateSeatsExist(
    flightId: number,
    seats: string[],
  ): Promise<void> {
    // TODO: Replace with DB lookup or cache
    // Example:
    // const validSeats = await flightSeatRepo.find()

    if (!seats.length) {
      throw new Error('No seats provided');
    }
  }
}
