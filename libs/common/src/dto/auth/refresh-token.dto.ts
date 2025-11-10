import { ClientType } from '@app/common';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class RefreshTokenDto {
  @IsNotEmpty()
  refreshToken: string;

  @IsString()
  deviceId?: string = '1234';

  @IsEnum(ClientType)
  @IsOptional()
  clientType?: ClientType = ClientType.WEB;
}
