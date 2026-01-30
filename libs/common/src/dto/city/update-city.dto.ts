import { PartialType } from '@nestjs/swagger';
import { CreateCityDto } from './create-city.dto';

/**
 * Shared DTO for updating an existing city
 * All fields are optional (partial update)
 */
export class UpdateCityDto extends PartialType(CreateCityDto) { }
