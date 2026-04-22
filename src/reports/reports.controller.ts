import { Controller, Get, Param, Res, Req, HttpStatus } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiProduces,
} from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { ReportsService } from './reports.service';
import { UseGuards } from '@nestjs/common';
import { ProjectIdGuard } from '../common/guards/project-id.guard';

@ApiTags('reports')
@Controller('reports')
@UseGuards(ProjectIdGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':projectId/awesome-by-behavior')
  @Get(':projectId/awesome-by-behavior/')
  @Get(':projectId/awesome-by-behavior/*')
  @ApiOperation({ summary: 'Редирект на отчёт по поведению' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiResponse({ status: 301, description: 'Редирект на актуальный отчёт' })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  async redirectToAwesomeBehavior(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const subPath = this.reportsService.extractFilePath(req);
    const url = await this.reportsService.getRedirectUrl(
      projectId,
      'awesome-by-behavior',
      subPath,
    );
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, url);
  }

  @Get(':projectId/awesome-by-suite')
  @Get(':projectId/awesome-by-suite/')
  @Get(':projectId/awesome-by-suite/*')
  @ApiOperation({ summary: 'Редирект на отчёт по наборам' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiResponse({ status: 301, description: 'Редирект на актуальный отчёт' })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  async redirectToAwesomeSuite(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const subPath = this.reportsService.extractFilePath(req);
    const url = await this.reportsService.getRedirectUrl(
      projectId,
      'awesome-by-suite',
      subPath,
    );
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, url);
  }

  @Get(':projectId/dashboard')
  @Get(':projectId/dashboard/')
  @Get(':projectId/dashboard/*')
  @ApiOperation({ summary: 'Редирект на дашборд' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiResponse({ status: 301, description: 'Редирект на актуальный отчёт' })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  async redirectToDashboard(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const subPath = this.reportsService.extractFilePath(req);
    const url = await this.reportsService.getRedirectUrl(
      projectId,
      'dashboard',
      subPath,
    );
    return res.redirect(HttpStatus.MOVED_PERMANENTLY, url);
  }

  @Get(':projectId/latest/*')
  @ApiOperation({ summary: 'Получить файл последнего отчёта' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiParam({
    name: '*',
    description: 'Путь к файлу',
    required: false,
  })
  @ApiProduces(
    'text/html',
    'text/css',
    'application/javascript',
    'image/*',
    'font/*',
  )
  @ApiResponse({ status: 200, description: 'Файл отчёта' })
  @ApiResponse({ status: 403, description: 'Доступ запрещён' })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка сервера' })
  async getLatestReportFile(
    @Param('projectId') projectId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const requestedPath = this.reportsService.extractFilePath(req);
    const { filePath, contentType, cacheMaxAge } =
      await this.reportsService.getLatestReportFile(projectId, requestedPath);

    res.setHeader('Content-Type', contentType);
    if (cacheMaxAge > 0) {
      res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge / 1000}`);
    }

    return res.sendFile(filePath);
  }

  @Get(':projectId/latest')
  @ApiOperation({ summary: 'Получить index.html последнего отчёта' })
  @ApiParam({
    name: 'projectId',
    description: 'UUID проекта',
    example: 'my-project',
  })
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'HTML отчёта' })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка сервера' })
  async getLatestReportIndex(
    @Param('projectId') projectId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, contentType } =
      await this.reportsService.getLatestReportFile(projectId, '');
    res.setHeader('Content-Type', contentType);
    return res.sendFile(filePath);
  }

  @Get(':projectId/:resultId/*')
  @ApiOperation({ summary: 'Получить файл отчёта (HTML или ассет)' })
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
  @ApiParam({
    name: '*',
    description: 'Путь к файлу',
    required: false,
  })
  @ApiProduces(
    'text/html',
    'text/css',
    'application/javascript',
    'image/*',
    'font/*',
  )
  @ApiResponse({ status: 200, description: 'Файл отчёта' })
  @ApiResponse({ status: 403, description: 'Доступ запрещён' })
  @ApiResponse({ status: 404, description: 'Отчёт или файл не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка сервера' })
  async getReportFile(
    @Param('projectId') projectId: string,
    @Param('resultId') resultId: string,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    const requestedPath = this.reportsService.extractFilePath(req);
    const { filePath, contentType, cacheMaxAge } =
      await this.reportsService.getReportFile(
        projectId,
        resultId,
        requestedPath,
      );

    res.setHeader('Content-Type', contentType);
    if (cacheMaxAge > 0) {
      res.setHeader('Cache-Control', `public, max-age=${cacheMaxAge / 1000}`);
    }

    return res.sendFile(filePath);
  }

  @Get(':projectId/:resultId')
  @ApiOperation({ summary: 'Получить index.html отчёта' })
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
  @ApiProduces('text/html')
  @ApiResponse({ status: 200, description: 'HTML отчёта' })
  @ApiResponse({ status: 404, description: 'Отчёт не найден' })
  @ApiResponse({ status: 500, description: 'Ошибка сервера' })
  async getReportIndex(
    @Param('projectId') projectId: string,
    @Param('resultId') resultId: string,
    @Res() res: Response,
  ): Promise<void> {
    const { filePath, contentType } = await this.reportsService.getReportFile(
      projectId,
      resultId,
      '',
    );
    res.setHeader('Content-Type', contentType);
    return res.sendFile(filePath);
  }
}
