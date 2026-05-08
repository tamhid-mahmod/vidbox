import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Delete,
  UseGuards,
  Req,
} from '@nestjs/common';

import { ClerkAuthGuard } from '@common/guards/clerk/clerk.guard';

import { PlaylistService } from './playlist.service';
import { CreatePlaylistDto } from './dto/create-playlist.dto';
import { UpdatePlaylistDto } from './dto/update-playlist.dto';

// ----------------------------------------------------------------------

@Controller('playlists')
@ApiTags('playlists')
@UseGuards(ClerkAuthGuard)
@ApiBearerAuth()
export class PlaylistController {
  constructor(private readonly playlistService: PlaylistService) {}

  @Post()
  @ApiOperation({ summary: 'Create a playlist' })
  create(@Req() req: any, @Body() dto: CreatePlaylistDto) {
    return this.playlistService.create(req.user.id, dto);
  }

  @Get()
  @ApiOperation({ summary: 'List all playlists for logged in user' })
  findAll(@Req() req: any) {
    return this.playlistService.findAll(req.user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get a playlist by ID' })
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.playlistService.findOne(req.user.id, id);
  }

  @Patch(':id')
  @ApiOperation({ summary: 'Update a playlist' })
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdatePlaylistDto,
  ) {
    return this.playlistService.update(req.user.id, id, dto);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Delete a playlist' })
  remove(@Req() req: any, @Param('id') id: string) {
    return this.playlistService.remove(req.user.id, id);
  }
}
