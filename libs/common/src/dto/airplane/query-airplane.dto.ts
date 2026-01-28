import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';
import { BaseQueryDto } from '../query/base-query.dto';

/**
 * Shared DTO for querying airplanes with filters
 */
export class QueryAirplaneDto extends BaseQueryDto {
    @ApiPropertyOptional({
        description: 'Filter by manufacturer',
        example: 'Boeing',
    })
    @IsOptional()
    @IsString()
    manufacturer?: string;

    @ApiPropertyOptional({
        description: 'Filter by model number',
        example: '737',
    })
    @IsOptional()
    @IsString()
    modelNumber?: string;

    @ApiPropertyOptional({
        description: 'Filter by registration number',
        example: 'N123',
    })
    @IsOptional()
    @IsString()
    registrationNumber?: string;
}
