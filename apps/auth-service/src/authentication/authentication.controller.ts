// import { Controller, Logger } from '@nestjs/common';
// import {
//   Ctx,
//   MessagePattern,
//   Payload,
//   RmqContext,
// } from '@nestjs/microservices';
// import { AuthenticationService } from './authentication.service';
// import { SignInDto, SignOutDto, RefreshTokenDto, SignUpDto } from '@app/common';
// import { MessagePattern as MP } from '@app/common';

// @Controller()
// export class AuthMessageController {
//   private readonly logger = new Logger(AuthMessageController.name);

//   constructor(private readonly authService: AuthenticationService) {}

//   @MessagePattern(MP.AUTH_REGISTER)
//   async register(@Payload() data: SignUpDto, @Ctx() context: RmqContext) {
//     return this.handleMessage(context, async () => {
//       this.logger.debug('Registering user:', data.email);
//       return this.authService.register(data);
//     });
//   }

//   @MessagePattern(MP.AUTH_LOGIN)
//   async login(@Payload() data: SignInDto, @Ctx() context: RmqContext) {
//     return this.handleMessage(context, async () => {
//       return this.authService.signIn(data);
//     });
//   }

//   @MessagePattern(MP.AUTH_REFRESH)
//   async refresh(@Payload() data: RefreshTokenDto, @Ctx() context: RmqContext) {
//     return this.handleMessage(context, async () => {
//       return this.authService.refreshTokens(data);
//     });
//   }

//   @MessagePattern(MP.AUTH_SIGNOUT)
//   async signOut(@Payload() data: SignOutDto, @Ctx() context: RmqContext) {
//     return this.handleMessage(context, async () => {
//       return this.authService.signOut(data);
//     });
//   }

//   /**
//    * ✅ Centralized handler for safe message ack/nack
//    */
//   private async handleMessage<T>(
//     context: RmqContext,
//     callback: () => Promise<T>,
//   ): Promise<T> {
//     const channel = context.getChannelRef();
//     const originalMsg = context.getMessage();

//     try {
//       const result = await callback();
//       channel.ack(originalMsg); // ✅ Mark as successfully processed
//       return result;
//     } catch (error) {
//       this.logger.error('Error handling message:', error);

//       // 👇 Option 1: Acknowledge anyway to prevent infinite retry
//       channel.ack(originalMsg);

//       // 👇 Option 2: Requeue for retry (use sparingly)
//       // channel.nack(originalMsg, false, true);

//       throw error;
//     }
//   }
// }

import { Controller, Logger } from '@nestjs/common';
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
} from '@app/common';

@Controller()
export class AuthMessageController {
  private readonly logger = new Logger(AuthMessageController.name);

  constructor(private readonly authService: AuthenticationService) {}

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
}
