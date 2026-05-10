import { Module } from '@nestjs/common';

import { AuthModule } from '../auth/auth.module';
import { AuditController } from './audit.controller';
import { AuditReaderService } from './audit-reader.service';

@Module({
  imports: [AuthModule],
  controllers: [AuditController],
  providers: [AuditReaderService],
})
export class AuditApiModule {}
