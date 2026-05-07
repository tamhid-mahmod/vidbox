import { ApiKeyController } from './api-key.controller';
import { ApiKeyService } from './api-key.service';

describe('ApiKeyController', () => {
  let controller: ApiKeyController;
  let apiKeyService: jest.Mocked<
    Pick<
      ApiKeyService,
      | 'createApiKey'
      | 'listApiKeys'
      | 'getApiKeyLastUsed'
      | 'deleteApiKey'
      | 'regenerateApiKey'
    >
  >;

  beforeEach(() => {
    apiKeyService = {
      createApiKey: jest.fn(),
      listApiKeys: jest.fn(),
      getApiKeyLastUsed: jest.fn(),
      deleteApiKey: jest.fn(),
      regenerateApiKey: jest.fn(),
    };

    controller = new ApiKeyController(apiKeyService as unknown as ApiKeyService);
  });

  it('creates an API key for the authenticated user', async () => {
    apiKeyService.createApiKey.mockResolvedValue({
      key: 'VBX_test_key',
    });

    const req = { user: { id: 'user-1' } } as any;
    const result = await controller.createApiKey(req);

    expect(apiKeyService.createApiKey).toHaveBeenCalledWith('user-1');
    expect(result).toEqual({ key: 'VBX_test_key' });
  });

  it('lists API keys for the authenticated user', async () => {
    const rows = [{ id: 'key-1' }, { id: 'key-2' }];
    apiKeyService.listApiKeys.mockResolvedValue(rows as never);

    const req = { user: { id: 'user-1' } } as any;
    const result = await controller.listApiKeys(req);

    expect(apiKeyService.listApiKeys).toHaveBeenCalledWith('user-1');
    expect(result).toEqual(rows);
  });

  it('returns API key last-used timestamp by key id', async () => {
    const lastUsed = new Date('2025-01-01T00:00:00.000Z');
    apiKeyService.getApiKeyLastUsed.mockResolvedValue(lastUsed);

    const req = { user: { id: 'user-1' } } as any;
    const result = await controller.apiKeyLastUsed(req, 'key-1');

    expect(apiKeyService.getApiKeyLastUsed).toHaveBeenCalledWith('key-1');
    expect(result).toEqual(lastUsed);
  });

  it('revokes an API key for the authenticated user', async () => {
    apiKeyService.deleteApiKey.mockResolvedValue(undefined);

    const req = { user: { id: 'user-1' } } as any;
    await controller.deleteApiKey(req, 'key-1');

    expect(apiKeyService.deleteApiKey).toHaveBeenCalledWith('user-1', 'key-1');
  });

  it('regenerates an API key for the authenticated user', async () => {
    apiKeyService.regenerateApiKey.mockResolvedValue({
      key: 'VBX_regenerated_key',
    });

    const req = { user: { id: 'user-1' } } as any;
    const result = await controller.regenerateApiKey(req, 'key-1');

    expect(apiKeyService.regenerateApiKey).toHaveBeenCalledWith(
      'user-1',
      'key-1',
    );
    expect(result).toEqual({ key: 'VBX_regenerated_key' });
  });
});
