import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { PagedResponse } from '../../common/interfaces/paged-response.interface';

import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { AuthenticatedUser } from '../auth/interfaces/authenticated-user.interface';
import { CreateUserDto } from './dto/create-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { ResetUserPasswordDto } from './dto/reset-user-password.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { UserResponse } from './interfaces/user-response.interface';
import { UsersService } from './users.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  async me(@CurrentUser() user: AuthenticatedUser): Promise<UserResponse> {
    return this.usersService.getMe(user.id);
  }

  @Roles(UserRole.ADMIN)
  @Get('users')
  async list(@Query() query: ListUsersQueryDto): Promise<PagedResponse<UserResponse>> {
    return this.usersService.list(query);
  }

  @Roles(UserRole.ADMIN)
  @Get('users/:id')
  async get(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.getById(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('users')
  async create(@Body() body: CreateUserDto): Promise<UserResponse> {
    return this.usersService.create(body);
  }

  @Roles(UserRole.ADMIN)
  @Patch('users/:id')
  async update(@Param('id') id: string, @Body() body: UpdateUserDto): Promise<UserResponse> {
    return this.usersService.update(id, body);
  }

  @Roles(UserRole.ADMIN)
  @Post('users/:id/password')
  async resetPassword(@Param('id') id: string, @Body() body: ResetUserPasswordDto): Promise<void> {
    await this.usersService.resetPassword(id, body.newPassword);
  }

  @Roles(UserRole.ADMIN)
  @Post('users/:id/deactivate')
  async deactivate(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.deactivate(id);
  }

  @Roles(UserRole.ADMIN)
  @Post('users/:id/reactivate')
  async reactivate(@Param('id') id: string): Promise<UserResponse> {
    return this.usersService.reactivate(id);
  }
}
