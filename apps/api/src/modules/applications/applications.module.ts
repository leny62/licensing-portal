import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { ApplicationSlaService } from './application-sla.service';
import { ApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { RegulatoryService } from './regulatory.service';

@Module({
  imports: [AuthModule],
  controllers: [ApplicationsController],
  providers: [ApplicationsService, RegulatoryService, ApplicationSlaService],
  exports: [ApplicationsService, RegulatoryService],
})
export class ApplicationsModule {}
