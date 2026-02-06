import { ClientType } from '@app/common';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class RefreshTokenDto {
  @ApiProperty({ description: 'The refresh token' })
  @IsNotEmpty()
  refreshToken: string;

  @ApiPropertyOptional({
    example: '1234',
    description: 'Unique device identifier',
  })
  @IsString()
  deviceId?: string = '1234';

  @ApiPropertyOptional({
    enum: ClientType,
    example: ClientType.WEB,
    description: 'Client platform type',
  })
  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType = ClientType.WEB;
}
