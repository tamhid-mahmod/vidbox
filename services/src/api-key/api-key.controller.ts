import type { Request } from 'express';

import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';

import { ClerkAuthGuard } from '@common/guards/clerk/clerk.guard';

import { ApiKeyService } from './api-key.service';

export type AuthenticatedRequest = Request & {
  user: {
    id: string;
  };
};

@Controller('api-keys')
@ApiTags('API Keys')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class ApiKeyController {
  constructor(private readonly apiKeyService: ApiKeyService) {}

  @Post()
  @ApiOperation({ summary: 'create a new API Key' })
  async createApiKey(@Req() req: AuthenticatedRequest) {
    return await this.apiKeyService.createApiKey(req.user.id);
  }

  @Get()
  @ApiOperation({ summary: 'List all API Keys' })
  async listApiKeys(@Req() req: AuthenticatedRequest) {
    return await this.apiKeyService.listApiKeys(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'API key Last Used' })
  async apiKeyLastUsed(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return await this.apiKeyService.getApiKeyLastUsed(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke (delete) an API key' })
  async deleteApiKey(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return await this.apiKeyService.deleteApiKey(req.user.id, id);
  }

  @Post(':id/regenerate')
  @ApiOperation({ summary: 'Regenerate an API key' })
  async regenerateApiKey(
    @Req() req: AuthenticatedRequest,
    @Param('id') id: string,
  ) {
    return await this.apiKeyService.regenerateApiKey(req.user.id, id);
  }
}
