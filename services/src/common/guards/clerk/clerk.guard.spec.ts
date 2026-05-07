import { ExecutionContext, UnauthorizedException } from '@nestjs/common';

import { ClerkAuthGuard } from './clerk.guard';

describe('ClerkAuthGuard', () => {
  let guard: ClerkAuthGuard;

  beforeEach(() => {
    const db = {
      query: {
        api_key: {
          findFirst: jest.fn(),
        },
      },
    };

    const redis = {
      set: jest.fn(),
      hset: jest.fn(),
      hgetall: jest.fn(),
      expire: jest.fn(),
    };

    guard = new ClerkAuthGuard(db as any, redis as any);
  });

  it('should be defined', () => {
    expect(guard).toBeDefined();
  });

  it('throws UnauthorizedException when auth headers are missing', async () => {
    const req = { headers: {} };
    const context = {
      switchToHttp: () => ({
        getRequest: () => req,
      }),
    } as unknown as ExecutionContext;

    await expect(guard.canActivate(context)).rejects.toThrow(
      new UnauthorizedException('Missing authentication token'),
    );
  });
});
