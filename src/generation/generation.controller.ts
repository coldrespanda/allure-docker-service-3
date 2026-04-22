import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiQuery,
  ApiBody,
} from '@nestjs/swagger';
import { GenerationService } from './generation.service';
import { GenerateReportDto } from './dto/generate-report.dto';
import { UseGuards } from '@nestjs/common';
import { ProjectIdGuard } from '../common/guards/project-id.guard';
import {
  TaskResponseDto,
  GenerateReportResponseDto,
  TaskListResponseDto,
} from './dto/response-task.dto';

@ApiTags('generation')
@Controller('api/generation')
@UseGuards(ProjectIdGuard)
export class GenerationController {
  constructor(private readonly generationService: GenerationService) {}

  @Post('generate/:projectId')
  @HttpCode(HttpStatus.ACCEPTED)
  @ApiOperation({ summary: 'Запустить генерацию отчёта' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiBody({
    type: GenerateReportDto,
    description: 'ID результата для генерации',
  })
  @ApiResponse({
    status: 202,
    description: 'Генерация запущена',
    type: GenerateReportResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: 'Некорректный запрос (уже генерируется или уже готов)',
  })
  @ApiResponse({ status: 404, description: 'Проект или результат не найден' })
  async generateReport(
    @Param('projectId') projectId: string,
    @Body() dto: GenerateReportDto,
  ): Promise<GenerateReportResponseDto> {
    const task = await this.generationService.startGeneration(
      projectId,
      dto.resultId,
    );

    return {
      taskId: task.id,
      status: task.status,
      message: 'Report generation started',
      task,
    };
  }

  @Get('tasks/:taskId')
  @ApiOperation({ summary: 'Получить статус задачи генерации' })
  @ApiParam({
    name: 'taskId',
    description: 'UUID задачи',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Задача найдена',
    type: TaskResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Задача не найдена' })
  getTask(@Param('taskId') taskId: string): TaskResponseDto {
    return this.generationService.getTask(taskId);
  }

  @Get('tasks')
  @ApiOperation({ summary: 'Получить список задач' })
  @ApiQuery({
    name: 'projectId',
    required: false,
    description: 'Фильтр по UUID проекта',
    example: 'my-project',
  })
  @ApiResponse({
    status: 200,
    description: 'Список задач',
    type: TaskListResponseDto,
  })
  getAllTasks(@Query('projectId') projectId?: string): TaskListResponseDto {
    const tasks = this.generationService.getAllTasks(projectId);
    return { tasks };
  }
}
