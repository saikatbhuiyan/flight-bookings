import { Test, TestingModule } from '@nestjs/testing';
import { HashingService } from './hashing.service';
import { BcryptService } from './bcrypt.service';

describe('HashingService', () => {
  let service: HashingService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BcryptService,
        {
          provide: HashingService,
          useExisting: BcryptService,
        },
      ],
    }).compile();

    service = module.get(HashingService);
  });

  it('resolves the hashing implementation through the abstract service token', () => {
    expect(service).toBeDefined();
    expect(service).toBeInstanceOf(BcryptService);
  });

  it('hashes plaintext values into a different persisted representation', async () => {
    const plaintext = 'Password123!';

    const hashedValue = await service.hash(plaintext);

    expect(hashedValue).toEqual(expect.any(String));
    expect(hashedValue).not.toBe(plaintext);
    expect(hashedValue.length).toBeGreaterThan(20);
  });

  it('accepts valid secrets and rejects invalid ones', async () => {
    const plaintext = 'Password123!';
    const hashedValue = await service.hash(plaintext);

    await expect(service.compare(plaintext, hashedValue)).resolves.toBe(true);
    await expect(service.compare('WrongPassword123!', hashedValue)).resolves.toBe(false);
  });
});
