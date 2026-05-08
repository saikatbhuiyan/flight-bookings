/* eslint-disable @typescript-eslint/unbound-method */
jest.mock('uuid', () => ({
  v4: jest.fn(() => 'mock-uuid'),
}));

import { Test, TestingModule } from '@nestjs/testing';
import { ApiResponseDto } from '@app/common/utils/api-response.dto';
import { RmqHelper } from '@app/common/utils/rmq.helper';
import { AuthMessageController } from './authentication.controller';
import { AuthenticationService } from './authentication.service';

describe('AuthMessageController', () => {
  let controller: AuthMessageController;
  let authService: jest.Mocked<AuthenticationService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AuthMessageController],
      providers: [
        {
          provide: AuthenticationService,
          useValue: {
            register: jest.fn(),
            signIn: jest.fn(),
            refreshTokens: jest.fn(),
            signOut: jest.fn(),
            validateUser: jest.fn(),
          },
        },
      ],
    }).compile();

    controller = module.get(AuthMessageController);
    authService = module.get(AuthenticationService);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('wraps HTTP register responses in the standard API envelope', async () => {
    authService.register.mockResolvedValue({
      id: 1,
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    await expect(
      controller.register({
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'Password123!',
      }),
    ).resolves.toEqual(
      ApiResponseDto.success(
        {
          id: 1,
          email: 'jane@example.com',
          firstName: 'Jane',
          lastName: 'Doe',
        },
        'user.create.success',
      ),
    );
  });

  it('delegates RMQ register calls through the ack helper', async () => {
    const handleAckSpy = jest
      .spyOn(RmqHelper, 'handleAck')
      .mockImplementation(async (_context, callback) => callback());
    authService.register.mockResolvedValue({
      id: 1,
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
    });

    await controller.register(
      {
        firstName: 'Jane',
        lastName: 'Doe',
        email: 'jane@example.com',
        password: 'Password123!',
      },
      {
        getChannelRef: jest.fn(),
        getMessage: jest.fn(),
      } as never,
    );

    expect(handleAckSpy).toHaveBeenCalled();
    expect(authService.register).toHaveBeenCalled();
  });

  it('passes the request IP through the HTTP login path', async () => {
    authService.signIn.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });

    await expect(
      controller.login(
        {
          email: 'jane@example.com',
          password: 'Password123!',
          deviceId: 'device-1',
          clientType: undefined,
        },
        { ip: '127.0.0.1' } as never,
      ),
    ).resolves.toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });

    expect(authService.signIn).toHaveBeenCalledWith(
      expect.objectContaining({ email: 'jane@example.com' }),
      '127.0.0.1',
    );
  });

  it('does not pass request IP through the RMQ login path', async () => {
    jest.spyOn(RmqHelper, 'handleAck').mockImplementation(async (_context, callback) => callback());
    authService.signIn.mockResolvedValue({ accessToken: 'access', refreshToken: 'refresh' });

    await controller.login(
      {
        email: 'jane@example.com',
        password: 'Password123!',
        deviceId: 'device-1',
        clientType: undefined,
      },
      { ip: '127.0.0.1' } as never,
      {
        getChannelRef: jest.fn(),
        getMessage: jest.fn(),
      } as never,
    );

    expect(authService.signIn).toHaveBeenCalledWith(expect.objectContaining({ email: 'jane@example.com' }));
  });

  it('wraps HTTP refresh responses in the standard API envelope', async () => {
    authService.refreshTokens.mockResolvedValue({ accessToken: 'next-access', refreshToken: 'next-refresh' });

    await expect(
      controller.refresh({
        refreshToken: 'refresh-token',
        deviceId: 'device-1',
        clientType: undefined,
      }),
    ).resolves.toEqual(
      ApiResponseDto.success({ accessToken: 'next-access', refreshToken: 'next-refresh' }, 'auth.refresh.success'),
    );
  });

  it('delegates sign-out and user validation through the ack helper', async () => {
    jest.spyOn(RmqHelper, 'handleAck').mockImplementation(async (_context, callback) => callback());
    authService.validateUser.mockResolvedValue({
      id: 1,
      email: 'jane@example.com',
      firstName: 'Jane',
      lastName: 'Doe',
      roles: [],
    });

    await controller.signOut(
      {
        userId: 1,
        deviceId: 'device-1',
        clientType: undefined,
      },
      {
        getChannelRef: jest.fn(),
        getMessage: jest.fn(),
      } as never,
    );
    await controller.validateUser({ id: 1, email: 'jane@example.com' }, {
      getChannelRef: jest.fn(),
      getMessage: jest.fn(),
    } as never);

    expect(authService.signOut).toHaveBeenCalledWith(expect.objectContaining({ userId: 1 }));
    expect(authService.validateUser).toHaveBeenCalledWith({ id: 1, email: 'jane@example.com' });
  });
});
