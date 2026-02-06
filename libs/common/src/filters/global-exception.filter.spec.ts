import { Test, TestingModule } from '@nestjs/testing';
import { GlobalExceptionFilter } from './global-exception.filter';
import { ConfigService } from '@nestjs/config';
import { WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import { HttpException, HttpStatus, ArgumentsHost } from '@nestjs/common';
import { QueryFailedError } from 'typeorm';

describe('GlobalExceptionFilter', () => {
  let filter: GlobalExceptionFilter;
  let configService: ConfigService;
  let logger: any;

  const mockResponse = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
  };

  const mockRequest = {
    url: '/api/v1/test',
    method: 'GET',
    headers: {},
  };

  const mockArgumentsHost = {
    switchToHttp: jest.fn().mockReturnThis(),
    getResponse: jest.fn().mockReturnValue(mockResponse),
    getRequest: jest.fn().mockReturnValue(mockRequest),
    getType: jest.fn().mockReturnValue('http'),
  } as unknown as ArgumentsHost;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        GlobalExceptionFilter,
        {
          provide: ConfigService,
          useValue: {
            get: jest.fn().mockReturnValue('1.0'),
          },
        },
        {
          provide: WINSTON_MODULE_NEST_PROVIDER,
          useValue: {
            error: jest.fn(),
            warn: jest.fn(),
            log: jest.fn(),
          },
        },
      ],
    }).compile();

    filter = module.get<GlobalExceptionFilter>(GlobalExceptionFilter);
    configService = module.get<ConfigService>(ConfigService);
    logger = module.get(WINSTON_MODULE_NEST_PROVIDER);
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(filter).toBeDefined();
  });

  it('should handle HttpException and add errorCode', () => {
    const exception = new HttpException('Not Found', HttpStatus.NOT_FOUND);

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.NOT_FOUND);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        statusCode: 404,
        message: 'Not Found',
        errorCode: 'ERR_NOT_FOUND',
      }),
    );
  });

  it('should handle QueryFailedError and add errorCode', () => {
    const exception = new QueryFailedError(
      'query',
      [],
      new Error('driver error'),
    );
    (exception as any).code = '23505';

    filter.catch(exception, mockArgumentsHost);

    expect(mockResponse.status).toHaveBeenCalledWith(HttpStatus.BAD_REQUEST);
    expect(mockResponse.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        errorCode: 'ERR_DUPLICATE_ENTRY',
      }),
    );
  });

  it('should hide stack trace in production', () => {
    process.env.NODE_ENV = 'production';
    const exception = new Error('Internal error');

    filter.catch(exception, mockArgumentsHost);

    const jsonResponse = mockResponse.json.mock.calls[0][0];
    expect(jsonResponse.message).toBe(
      'An unexpected error occurred. Please try again later.',
    );
    expect(jsonResponse.errors).toBeUndefined();

    process.env.NODE_ENV = 'test'; // Reset
  });

  it('should show stack trace in non-production mode', () => {
    process.env.NODE_ENV = 'development';
    const exception = new Error('Internal error');

    filter.catch(exception, mockArgumentsHost);

    const jsonResponse = mockResponse.json.mock.calls[0][0];
    expect(jsonResponse.errors).toBeDefined();
    expect(jsonResponse.errors[0]).toContain('Error: Internal error');

    process.env.NODE_ENV = 'test'; // Reset
  });
});
