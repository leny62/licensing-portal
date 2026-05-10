import { Controller, Get, Header, Query, UseGuards } from '@nestjs/common';
import { ApiBearerAuth } from '@nestjs/swagger';
import { UserRole } from '@prisma/client';

import { PagedResponse } from '../../common/interfaces/paged-response.interface';
import { Roles } from '../auth/decorators/roles.decorator';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { ListSystemLogsQueryDto } from './dto/list-system-logs-query.dto';
import { SystemLogResponse } from './interfaces/system-log-response.interface';
import { SystemLogsService } from './system-logs.service';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(UserRole.ADMIN)
@Controller('system-logs')
export class SystemLogsController {
  constructor(private readonly systemLogsService: SystemLogsService) {}

  @Get()
  async list(@Query() query: ListSystemLogsQueryDto): Promise<PagedResponse<SystemLogResponse>> {
    return this.systemLogsService.list(query);
  }

  @Get('export')
  @Header('Content-Type', 'text/csv; charset=utf-8')
  @Header('Content-Disposition', 'attachment; filename="system-logs.csv"')
  async export(@Query() query: ListSystemLogsQueryDto): Promise<string> {
    return this.systemLogsService.exportCsv(query);
  }
}
