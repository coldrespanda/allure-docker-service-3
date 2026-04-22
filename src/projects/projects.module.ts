import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ProjectsController } from './projects.controller';
import { ProjectsService } from './projects.service';
import { MimeService } from '../common/mime.service';
import { ZipValidatorService } from '../common/zip-validator.service';
import { GenerationModule } from '../generation/generation.module';

@Module({
  imports: [ConfigModule, forwardRef(() => GenerationModule)],
  controllers: [ProjectsController],
  providers: [ProjectsService, MimeService, ZipValidatorService],
  exports: [ProjectsService],
})
export class ProjectsModule {}
