import { Module } from '@nestjs/common';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';
import { ProjectsModule } from '../projects/projects.module';
import { MimeService } from '../common/mime.service';

@Module({
  imports: [ProjectsModule],
  controllers: [ReportsController],
  providers: [ReportsService, MimeService],
  exports: [ReportsService],
})
export class ReportsModule {}
