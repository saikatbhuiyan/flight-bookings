import { PartialType } from '@nestjs/swagger';
import { CreateAirplaneDto } from './create-airplane.dto';

/**
 * Shared DTO for updating an existing airplane
 */
export class UpdateAirplaneDto extends PartialType(CreateAirplaneDto) { }
