import { Module, forwardRef } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { GenerationController } from './generation.controller';
import { GenerationService } from './generation.service';
import { AllureConfigService } from './allure-config.service';
import { ProjectsModule } from '../projects/projects.module';

@Module({
  imports: [ConfigModule, forwardRef(() => ProjectsModule)],
  controllers: [GenerationController],
  providers: [GenerationService, AllureConfigService],
  exports: [GenerationService],
})
export class GenerationModule {}
