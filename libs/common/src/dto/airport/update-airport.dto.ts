import { PartialType } from '@nestjs/swagger';
import { CreateAirportDto } from './create-airport.dto';

/**
 * Shared DTO for updating an existing airport
 * All fields are optional (partial update)
 */
export class UpdateAirportDto extends PartialType(CreateAirportDto) {}
