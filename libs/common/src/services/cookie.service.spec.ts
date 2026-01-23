import { Test, TestingModule } from '@nestjs/testing';
import { CookieService } from './cookie.service';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';

describe('CookieService', () => {
    let service: CookieService;
    let configService: ConfigService;

    const mockResponse = {
        cookie: jest.fn(),
        clearCookie: jest.fn(),
    } as unknown as Response;

    beforeEach(async () => {
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CookieService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn((key: string) => {
                            if (key === 'jwt.accessTokenTtl') return 300; // 5 min
                            if (key === 'jwt.refreshTokenTtl') return 3600; // 1 hr
                            if (key === 'NODE_ENV') return 'development';
                            return undefined;
                        }),
                    },
                },
            ],
        }).compile();

        service = module.get<CookieService>(CookieService);
        configService = module.get<ConfigService>(ConfigService);
    });

    it('should be defined', () => {
        expect(service).toBeDefined();
    });

    it('should calculate milliseconds correctly from seconds', () => {
        service.setAccessToken(mockResponse, 'token', 'device1');
        expect(mockResponse.cookie).toHaveBeenCalledWith(
            'accessToken_device1',
            'token',
            expect.objectContaining({
                maxAge: 300 * 1000,
            }),
        );
    });

    it('should use fallback values if config is missing', async () => {
        // Re-initialize with missing config
        const module: TestingModule = await Test.createTestingModule({
            providers: [
                CookieService,
                {
                    provide: ConfigService,
                    useValue: {
                        get: jest.fn().mockReturnValue(undefined),
                    },
                },
            ],
        }).compile();

        const serviceWithNoConfig = module.get<CookieService>(CookieService);
        serviceWithNoConfig.setAccessToken(mockResponse, 'token', 'device1');

        expect(mockResponse.cookie).toHaveBeenCalledWith(
            'accessToken_device1',
            'token',
            expect.objectContaining({
                maxAge: 3600 * 1000, // Default fallback
            }),
        );
    });
});
