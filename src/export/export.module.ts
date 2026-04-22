import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ExportController } from './export.controller';
import { ExportService } from './export.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ConfigModule, ProjectsModule],
  controllers: [ExportController],
  providers: [ExportService],
})
export class ExportModule {}
