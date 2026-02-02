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
    private readonly LOCK_TTL = 900; // 15 minutes in seconds
    private readonly LOCK_PREFIX = 'seat:lock';

    constructor(private readonly redisService: RedisService) { }

    /**
     * Atomically lock multiple seats using Lua script
     * This ensures all-or-nothing locking behavior
     */
    async lockSeats(
        flightId: number,
        seats: string[],
        bookingId: string,
        userId: number,
    ): Promise<SeatLockResult> {
        const redis = this.redisService.getClient();
        const timestamp = Date.now();
        const expiresAt = new Date(timestamp + this.LOCK_TTL * 1000);

        // Lua script for atomic multi-seat locking
        const luaScript = `
      local flight_id = ARGV[1]
      local booking_id = ARGV[2]
      local user_id = ARGV[3]
      local ttl = tonumber(ARGV[4])
      local timestamp = tonumber(ARGV[5])
      
      local locked_seats = {}
      local failed_seats = {}
      local all_available = true
      
      -- First pass: Check if all seats are available
      for i = 6, #ARGV do
        local seat = ARGV[i]
        local key = "seat:lock:" .. flight_id .. ":" .. seat
        local existing = redis.call('GET', key)
        
        if existing ~= false then
          -- Seat is locked, check if it's expired or same booking
          local lock_data = cjson.decode(existing)
          if lock_data.bookingId == booking_id then
            -- Same booking, allow re-lock
          elseif lock_data.expiresAt < timestamp then
            -- Lock expired, can override
          else
            -- Seat is locked by another booking
            all_available = false
            table.insert(failed_seats, seat)
          end
        end
      end
      
      -- If all seats available, lock them atomically
      if all_available then
        for i = 6, #ARGV do
          local seat = ARGV[i]
          local key = "seat:lock:" .. flight_id .. ":" .. seat
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
        
        -- Create a booking lock key for easy cleanup
        local booking_key = "seat:lock:booking:" .. booking_id
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

        try {
            const result = await redis.eval(
                luaScript,
                0, // No KEYS, using ARGV only
                flightId.toString(),
                bookingId,
                userId.toString(),
                this.LOCK_TTL.toString(),
                timestamp.toString(),
                ...seats,
            ) as [number, string, string];

            const [success, lockedSeatsJson, failedSeatsJson] = result;
            const lockedSeats = JSON.parse(lockedSeatsJson);
            const failedSeats = JSON.parse(failedSeatsJson);

            if (success === 1) {
                this.logger.log(
                    `Successfully locked ${lockedSeats.length} seats for booking ${bookingId}`,
                );
                return {
                    success: true,
                    lockedSeats,
                    failedSeats: [],
                    lockKey: `seat:lock:booking:${bookingId}`,
                    expiresAt,
                };
            } else {
                this.logger.warn(
                    `Failed to lock seats for booking ${bookingId}. Failed seats: ${failedSeats.join(', ')}`,
                );
                return {
                    success: false,
                    lockedSeats: [],
                    failedSeats,
                    lockKey: '',
                    expiresAt: new Date(),
                };
            }
        } catch (error) {
            this.logger.error('Error locking seats:', error);
            throw error;
        }
    }

    /**
     * Release seat locks for a booking
     */
    async releaseSeats(bookingId: string): Promise<void> {
        const redis = this.redisService.getClient();
        const bookingKey = `seat:lock:booking:${bookingId}`;

        try {
            const bookingData = await redis.get(bookingKey);
            if (!bookingData) {
                this.logger.warn(`No lock found for booking ${bookingId}`);
                return;
            }

            const { flightId, seats } = JSON.parse(bookingData);

            // Delete individual seat locks
            const pipeline = redis.pipeline();
            seats.forEach((seat: string) => {
                pipeline.del(`${this.LOCK_PREFIX}:${flightId}:${seat}`);
            });
            pipeline.del(bookingKey);

            await pipeline.exec();
            this.logger.log(`Released ${seats.length} seats for booking ${bookingId}`);
        } catch (error) {
            this.logger.error(`Error releasing seats for booking ${bookingId}:`, error);
            throw error;
        }
    }

    /**
     * Extend lock expiry (e.g., when user is still on payment page)
     */
    async extendLock(bookingId: string, additionalSeconds: number = 300): Promise<boolean> {
        const redis = this.redisService.getClient();
        const bookingKey = `seat:lock:booking:${bookingId}`;

        try {
            const bookingData = await redis.get(bookingKey);
            if (!bookingData) {
                return false;
            }

            const { flightId, seats } = JSON.parse(bookingData);

            // Extend TTL for all seat locks
            const pipeline = redis.pipeline();
            seats.forEach((seat: string) => {
                pipeline.expire(`${this.LOCK_PREFIX}:${flightId}:${seat}`, additionalSeconds);
            });
            pipeline.expire(bookingKey, additionalSeconds);

            await pipeline.exec();
            this.logger.log(`Extended lock for booking ${bookingId} by ${additionalSeconds}s`);
            return true;
        } catch (error) {
            this.logger.error(`Error extending lock for booking ${bookingId}:`, error);
            return false;
        }
    }

    /**
     * Check if seats are currently locked
     */
    async areSeatsLocked(flightId: number, seats: string[]): Promise<Map<string, boolean>> {
        const redis = this.redisService.getClient();
        const result = new Map<string, boolean>();

        const pipeline = redis.pipeline();
        seats.forEach(seat => {
            pipeline.get(`${this.LOCK_PREFIX}:${flightId}:${seat}`);
        });

        const responses = await pipeline.exec();

        seats.forEach((seat, index) => {
            const [err, lockData] = responses[index];
            result.set(seat, lockData !== null);
        });

        return result;
    }

    /**
     * Cleanup expired locks (run periodically)
     */
    async cleanupExpiredLocks(): Promise<number> {
        const redis = this.redisService.getClient();
        const pattern = `${this.LOCK_PREFIX}:*`;

        let cursor = '0';
        let deletedCount = 0;
        const now = Date.now();

        do {
            const [nextCursor, keys] = await redis.scan(
                cursor,
                'MATCH',
                pattern,
                'COUNT',
                100,
            );

            cursor = nextCursor;

            for (const key of keys) {
                const lockData = await redis.get(key);
                if (lockData) {
                    const { expiresAt } = JSON.parse(lockData);
                    if (expiresAt < now) {
                        await redis.del(key);
                        deletedCount++;
                    }
                }
            }
        } while (cursor !== '0');

        if (deletedCount > 0) {
            this.logger.log(`Cleaned up ${deletedCount} expired locks`);
        }

        return deletedCount;
    }
}
