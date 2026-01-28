import { applyDecorators, Type } from '@nestjs/common';
import { ApiOkResponse, getSchemaPath } from '@nestjs/swagger';
import { PaginationMeta } from '../dto/pagination-response.dto';

/**
 * Custom decorator for documenting paginated responses in Swagger
 * Generates proper OpenAPI schema for paginated endpoints
 */
export const ApiPaginatedResponse = <TModel extends Type<any>>(
    model: TModel,
) => {
    return applyDecorators(
        ApiOkResponse({
            description: 'Paginated response',
            schema: {
                allOf: [
                    {
                        properties: {
                            data: {
                                type: 'array',
                                items: { $ref: getSchemaPath(model) },
                            },
                            meta: {
                                type: 'object',
                                $ref: getSchemaPath(PaginationMeta),
                            },
                        },
                    },
                ],
            },
        }),
    );
};
