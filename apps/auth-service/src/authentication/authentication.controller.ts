import { Controller, Logger, UseFilters } from '@nestjs/common';
import {
  Ctx,
  MessagePattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';
import { AuthenticationService } from './authentication.service';
import {
  MessagePattern as MP,
  RefreshTokenDto,
  RmqHelper,
  SignInDto,
  SignOutDto,
  SignUpDto,
  CommonRpcExceptionFilter,
} from '@app/common';

@Controller()
@UseFilters(CommonRpcExceptionFilter)
export class AuthMessageController {
  private readonly logger = new Logger(AuthMessageController.name);

  constructor(private readonly authService: AuthenticationService) { }

  @MessagePattern(MP.AUTH_REGISTER)
  async register(@Payload() data: SignUpDto, @Ctx() context: RmqContext) {
    return RmqHelper.handleAck(context, async () => {
      this.logger.debug(`Registering ${data.email}`);
      return this.authService.register(data);
    });
  }

  @MessagePattern(MP.AUTH_LOGIN)
  login(@Payload() data: SignInDto, @Ctx() context: RmqContext) {
    return RmqHelper.handleAck(context, async () => {
      this.logger.debug(`Logging in ${data.email}`);
      return this.authService.signIn(data);
    });
  }

  @MessagePattern(MP.AUTH_REFRESH)
  async refresh(@Payload() data: RefreshTokenDto, @Ctx() context: RmqContext) {
    return RmqHelper.handleAck(context, async () => {
      return this.authService.refreshTokens(data);
    });
  }

  @MessagePattern(MP.AUTH_SIGNOUT)
  signOut(@Payload() data: SignOutDto, @Ctx() context: RmqContext) {
    return RmqHelper.handleAck(context, async () => {
      return this.authService.signOut(data);
    });
  }

  @MessagePattern(MP.AUTH_VALIDATE)
  validateUser(@Payload() data: any, @Ctx() context: RmqContext) {
    return RmqHelper.handleAck(context, async () => {
      return this.authService.validateUser(data);
    });
  }
}
