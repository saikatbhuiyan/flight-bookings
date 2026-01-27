import { MigrationInterface, QueryRunner } from "typeorm";

export class SeedInitialData1769475507497 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Insert Cities
        await queryRunner.query(`
      INSERT INTO cities (name, country, timezone) VALUES
      ('New York', 'USA', 'America/New_York'),
      ('Los Angeles', 'USA', 'America/Los_Angeles'),
      ('London', 'UK', 'Europe/London'),
      ('Dubai', 'UAE', 'Asia/Dubai'),
      ('Singapore', 'Singapore', 'Asia/Singapore'),
      ('Tokyo', 'Japan', 'Asia/Tokyo'),
      ('Mumbai', 'India', 'Asia/Kolkata'),
      ('Delhi', 'India', 'Asia/Kolkata'),
      ('Dhaka', 'Bangladesh', 'Asia/Dhaka');
    `);

        // Insert Airports
        await queryRunner.query(`
      INSERT INTO airports (name, code, icao_code, address, latitude, longitude, city_id) VALUES
      ('John F. Kennedy International Airport', 'JFK', 'KJFK', 'Queens, NY 11430', 40.6413, -73.7781, (SELECT id FROM cities WHERE name = 'New York')),
      ('Los Angeles International Airport', 'LAX', 'KLAX', 'Los Angeles, CA 90045', 33.9416, -118.4085, (SELECT id FROM cities WHERE name = 'Los Angeles')),
      ('London Heathrow Airport', 'LHR', 'EGLL', 'Longford TW6, UK', 51.4700, -0.4543, (SELECT id FROM cities WHERE name = 'London')),
      ('Dubai International Airport', 'DXB', 'OMDB', 'Dubai, UAE', 25.2532, 55.3657, (SELECT id FROM cities WHERE name = 'Dubai')),
      ('Singapore Changi Airport', 'SIN', 'WSSS', 'Singapore 819663', 1.3644, 103.9915, (SELECT id FROM cities WHERE name = 'Singapore')),
      ('Tokyo Haneda Airport', 'HND', 'RJTT', 'Tokyo 144-0041', 35.5494, 139.7798, (SELECT id FROM cities WHERE name = 'Tokyo')),
      ('Chhatrapati Shivaji International Airport', 'BOM', 'VABB', 'Mumbai 400099', 19.0896, 72.8656, (SELECT id FROM cities WHERE name = 'Mumbai')),
      ('Indira Gandhi International Airport', 'DEL', 'VIDP', 'New Delhi 110037', 28.5562, 77.1000, (SELECT id FROM cities WHERE name = 'Delhi')),
      ('Hazrat Shahjalal International Airport', 'DAC', 'VGHS', 'Dhaka 1229', 23.8433, 90.3978, (SELECT id FROM cities WHERE name = 'Dhaka'));
    `);

        // Insert Airplanes
        await queryRunner.query(`
      INSERT INTO airplanes (
        model_number, manufacturer, total_capacity, 
        economy_seats, business_seats, first_class_seats, premium_economy_seats,
        year_manufactured, registration_number, active
      ) VALUES
      ('737-800', 'Boeing', 189, 162, 20, 4, 3, 2020, 'N12345', true),
      ('A320', 'Airbus', 180, 150, 24, 6, 0, 2021, 'A67890', true),
      ('777-300ER', 'Boeing', 396, 264, 96, 8, 28, 2019, 'N98765', true),
      ('A380', 'Airbus', 544, 399, 96, 14, 35, 2018, 'A11111', true),
      ('787-9', 'Boeing', 296, 234, 48, 6, 8, 2022, 'N22222', true);
    `);

        // Insert Seats for first airplane (737-800 - N12345)
        await queryRunner.query(`
      INSERT INTO seats (airplane_id, row, col, type)
      SELECT (SELECT id FROM airplanes WHERE registration_number = 'N12345'), r, c, 'FIRST_CLASS'::seat_type
      FROM generate_series(1, 4) AS r, unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) AS c
      UNION ALL
      SELECT (SELECT id FROM airplanes WHERE registration_number = 'N12345'), r, c, 'BUSINESS'::seat_type
      FROM generate_series(5, 7) AS r, unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) AS c
      UNION ALL
      SELECT (SELECT id FROM airplanes WHERE registration_number = 'N12345'), r, c, 'ECONOMY'::seat_type
      FROM generate_series(8, 35) AS r, unnest(ARRAY['A', 'B', 'C', 'D', 'E', 'F']) AS c;
    `);

        // Insert Flights
        await queryRunner.query(`
      INSERT INTO flights (
        flight_number, airplane_id, 
        departure_airport_id, arrival_airport_id,
        departure_time, arrival_time,
        boarding_gate, terminal,
        economy_price, business_price, first_class_price, premium_economy_price,
        economy_seats_available, business_seats_available, 
        first_class_seats_available, premium_economy_seats_available,
        status
      ) VALUES
      -- JFK to LHR
      (
        'BA112', 
        (SELECT id FROM airplanes WHERE registration_number = 'N12345'),
        (SELECT id FROM airports WHERE code = 'JFK'), 
        (SELECT id FROM airports WHERE code = 'LHR'),
        '2025-02-01 18:30:00+00', '2025-02-02 06:45:00+00',
        'B22', '7',
        850.00, 3500.00, 8500.00, 1200.00,
        162, 20, 4, 3,
        'SCHEDULED'
      ),
      -- LAX to SIN
      (
        'SQ37', 
        (SELECT id FROM airplanes WHERE registration_number = 'N98765'),
        (SELECT id FROM airports WHERE code = 'LAX'), 
        (SELECT id FROM airports WHERE code = 'SIN'),
        '2025-02-02 23:50:00+00', '2025-02-04 07:35:00+00',
        'A15', '2',
        1200.00, 5500.00, 12000.00, 1800.00,
        264, 96, 8, 28,
        'SCHEDULED'
      ),
      -- DXB to JFK
      (
        'EK201', 
        (SELECT id FROM airplanes WHERE registration_number = 'A11111'),
        (SELECT id FROM airports WHERE code = 'DXB'), 
        (SELECT id FROM airports WHERE code = 'JFK'),
        '2025-02-03 10:20:00+00', '2025-02-03 16:30:00+00',
        'C7', '3',
        1450.00, 6200.00, 15000.00, 2100.00,
        399, 96, 14, 35,
        'SCHEDULED'
      ),
      -- DAC to DXB
      (
        'EK582', 
        (SELECT id FROM airplanes WHERE registration_number = 'A67890'),
        (SELECT id FROM airports WHERE code = 'DAC'), 
        (SELECT id FROM airports WHERE code = 'DXB'),
        '2025-02-05 02:00:00+00', '2025-02-05 05:30:00+00',
        'D12', '2',
        450.00, 1800.00, 4500.00, 650.00,
        150, 24, 6, 0,
        'SCHEDULED'
      ),
      -- BOM to LHR
      (
        'BA138', 
        (SELECT id FROM airplanes WHERE registration_number = 'N22222'),
        (SELECT id FROM airports WHERE code = 'BOM'), 
        (SELECT id FROM airports WHERE code = 'LHR'),
        '2025-02-06 14:40:00+00', '2025-02-06 19:15:00+00',
        'E8', '5',
        780.00, 3200.00, 7800.00, 1100.00,
        234, 48, 6, 8,
        'SCHEDULED'
      );
    `);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM flights`);
        await queryRunner.query(`DELETE FROM seats`);
        await queryRunner.query(`DELETE FROM airplanes`);
        await queryRunner.query(`DELETE FROM airports`);
        await queryRunner.query(`DELETE FROM cities`);
    }

}
