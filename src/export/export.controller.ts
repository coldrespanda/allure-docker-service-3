import { Controller, Get, Param, Res } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiProduces,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ExportService } from './export.service';
import { UseGuards } from '@nestjs/common';
import { ProjectIdGuard } from '../common/guards/project-id.guard';
import { ReportInfoResponseDto } from './dto/response-export.dto';

@ApiTags('export')
@Controller('api/export')
@UseGuards(ProjectIdGuard)
export class ExportController {
  constructor(private readonly exportService: ExportService) {}

  @Get('report/:projectId/:resultId')
  @ApiOperation({ summary: 'Экспортировать отчёт в ZIP' })
  @ApiProduces('application/zip')
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiParam({
    name: 'resultId',
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP архив с отчётом',
    content: { 'application/zip': {} },
  })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка при создании архива' })
  async exportReport(
    @Param('projectId') projectId: string,
    @Param('resultId') resultId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.exportService.exportReportToZip(projectId, resultId, res);
  }

  @Get('results/:projectId/:resultId')
  @ApiOperation({ summary: 'Экспортировать результаты в ZIP' })
  @ApiProduces('application/zip')
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiParam({
    name: 'resultId',
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'ZIP архив с результатами',
    content: { 'application/zip': {} },
  })
  @ApiResponse({ status: 404, description: 'Результаты не найдены' })
  @ApiResponse({ status: 500, description: 'Ошибка при создании архива' })
  async exportResults(
    @Param('projectId') projectId: string,
    @Param('resultId') resultId: string,
    @Res() res: Response,
  ): Promise<void> {
    await this.exportService.exportResultsToZip(projectId, resultId, res);
  }

  @Get('info/:projectId/:resultId')
  @ApiOperation({ summary: 'Получить информацию об отчёте' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiParam({
    name: 'resultId',
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 200,
    description: 'Информация об отчёте',
    type: ReportInfoResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  async getReportInfo(
    @Param('projectId') projectId: string,
    @Param('resultId') resultId: string,
  ): Promise<ReportInfoResponseDto> {
    return this.exportService.getReportInfo(projectId, resultId);
  }
}
