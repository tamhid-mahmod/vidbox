import argon2 from 'argon2';
import { BadRequestException } from '@nestjs/common';

import { LAST_USED_HASH, VERSION } from '@/configs';
import { api_key } from '@/database/schema';

import { ApiKeyService } from './api-key.service';

describe('ApiKeyService', () => {
  let service: ApiKeyService;
  let db: {
    select: jest.Mock;
    insert: jest.Mock;
    update: jest.Mock;
    query: {
      api_key: {
        findFirst: jest.Mock;
      };
    };
  };
  let redis: {
    del: jest.Mock;
    hget: jest.Mock;
  };

  let selectFromMock: jest.Mock;
  let selectWhereMock: jest.Mock;
  let insertValuesMock: jest.Mock;
  let updateSetMock: jest.Mock;
  let updateWhereMock: jest.Mock;
  let findFirstMock: jest.Mock;
  let argon2HashSpy: jest.SpyInstance;

  beforeEach(() => {
    selectWhereMock = jest.fn();
    selectFromMock = jest.fn(() => ({ where: selectWhereMock }));
    insertValuesMock = jest.fn();
    updateWhereMock = jest.fn();
    updateSetMock = jest.fn(() => ({ where: updateWhereMock }));
    findFirstMock = jest.fn();

    db = {
      select: jest.fn(() => ({ from: selectFromMock })),
      insert: jest.fn(() => ({ values: insertValuesMock })),
      update: jest.fn(() => ({ set: updateSetMock })),
      query: {
        api_key: {
          findFirst: findFirstMock,
        },
      },
    };

    redis = {
      del: jest.fn(),
      hget: jest.fn(),
    };
    argon2HashSpy = jest.spyOn(argon2, 'hash').mockResolvedValue('hashed-value');
    service = new ApiKeyService(db as any, redis as any);
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('creates an API key when user is below the limit', async () => {
    const generatedKey = {
      plaintextKey: 'VBX_123e4567e89b12d3a456426614174000_secret',
      keyId: '123e4567e89b12d3a456426614174000',
    };
    selectWhereMock.mockResolvedValue([{ count: 1 }]);
    insertValuesMock.mockResolvedValue(undefined);
    jest.spyOn(service as any, 'generateKey').mockReturnValue(generatedKey);

    const result = await service.createApiKey('user-1');

    expect(result.key).toBe(generatedKey.plaintextKey);
    expect(argon2.hash).toHaveBeenCalledWith(result.key, {
      type: argon2.argon2id,
      timeCost: 3,
      memoryCost: 1 << 16,
      parallelism: 1,
    });
    expect(db.insert).toHaveBeenCalledWith(api_key);
    expect(insertValuesMock).toHaveBeenCalledWith({
      id: generatedKey.keyId,
      user_id: 'user-1',
      value: 'hashed-value',
      prefix: `${result.key.substring(0, 18)}...`,
    });
  });

  it('throws when user already has 5 or more API keys', async () => {
    selectWhereMock.mockResolvedValue([{ count: 5 }]);

    await expect(service.createApiKey('user-1')).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(db.insert).not.toHaveBeenCalled();
    expect(argon2HashSpy).not.toHaveBeenCalled();
  });

  it('lists API keys for a user', async () => {
    const rows = [
      {
        id: 'k1',
        prefix: 'VBX_abc...',
      },
    ];
    selectWhereMock.mockResolvedValue(rows);

    const result = await service.listApiKeys('user-1');

    expect(result).toBe(rows);
    expect(db.select).toHaveBeenCalled();
    expect(selectFromMock).toHaveBeenCalledWith(api_key);
  });

  it('revokes an API key and clears redis cache entry', async () => {
    updateWhereMock.mockResolvedValue(undefined);
    redis.del.mockResolvedValue(1);

    await service.deleteApiKey('user-1', 'key-1');

    expect(db.update).toHaveBeenCalledWith(api_key);
    expect(updateSetMock).toHaveBeenCalledWith({
      revoked_at: expect.any(Date),
    });
    expect(redis.del).toHaveBeenCalledWith(`vbx:api_key:${VERSION}:key-1`);
  });

  it('regenerates an existing API key', async () => {
    const generatedKey = {
      plaintextKey: 'VBX_aaaaaaaabbbbccccddddeeeeeeeeeeee_secret',
      keyId: 'aaaaaaaabbbbccccddddeeeeeeeeeeee',
    };
    updateWhereMock.mockResolvedValue(undefined);
    argon2HashSpy.mockResolvedValue('new-hash');
    jest.spyOn(service as any, 'generateKey').mockReturnValue(generatedKey);

    const result = await service.regenerateApiKey('user-1', 'old-key-id');

    expect(result.key).toBe(generatedKey.plaintextKey);
    expect(updateSetMock).toHaveBeenCalledWith({
      value: 'new-hash',
      prefix: `${result.key.substring(0, 18)}...`,
      id: generatedKey.keyId,
    });
  });

  it('returns last used date from redis when present', async () => {
    redis.hget.mockResolvedValue('1715000000000');

    const result = await service.getApiKeyLastUsed('key-1');

    expect(redis.hget).toHaveBeenCalledWith(LAST_USED_HASH, 'key-1');
    expect(result).toEqual(new Date(1715000000000));
    expect(findFirstMock).not.toHaveBeenCalled();
  });

  it('falls back to database when redis has no value', async () => {
    const lastUsed = new Date('2025-01-01T00:00:00.000Z');
    redis.hget.mockResolvedValue(null);
    findFirstMock.mockResolvedValue({ last_used_at: lastUsed });

    const result = await service.getApiKeyLastUsed('key-1');

    expect(result).toEqual(lastUsed);
    expect(findFirstMock).toHaveBeenCalled();
  });

  it('returns null when last-used is missing from redis and database', async () => {
    redis.hget.mockResolvedValue(null);
    findFirstMock.mockResolvedValue(null);

    const result = await service.getApiKeyLastUsed('key-1');

    expect(result).toBeNull();
  });
});
