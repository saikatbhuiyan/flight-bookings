import {
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
} from 'class-validator';
import { ClientType } from '@app/common';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class SignInDto {
  @ApiProperty({ example: 'john.doe@example.com', description: 'User email' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!', description: 'User password' })
  @MinLength(8)
  @IsNotEmpty()
  password: string;

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
