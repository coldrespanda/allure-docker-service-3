import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  UploadedFiles,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Res,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { FilesInterceptor, FileInterceptor } from '@nestjs/platform-express';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiBody,
  ApiConsumes,
} from '@nestjs/swagger';
import type { Response } from 'express';
import { ProjectsService } from './projects.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { promises as fs } from 'fs';
import type { ProjectResult } from './interfaces/project.interface';
import { SendResultsDto, ResultFileDto } from './dto/send-results.dto';
import { Readable } from 'stream';
import { GenerationService } from '../generation/generation.service';
import { UseGuards } from '@nestjs/common';
import { ProjectIdGuard } from '../common/guards/project-id.guard';
import { MimeService } from '../common/mime.service';
import {
  ProjectResponseDto,
  ProjectListResponseDto,
  CreateProjectResponseDto,
  DeleteProjectResponseDto,
} from './dto/response-project.dto';
import {
  ResultResponseDto,
  UploadResultsResponseDto,
  SendResultsResponseDto,
  ReportsListResponseDto,
  LatestReportResponseDto,
  DeleteReportResponseDto,
} from './dto/response-result.dto';
import { UPLOAD_LIMITS } from '../common/upload.constants';

@ApiTags('projects')
@Controller('api/projects')
@UseGuards(ProjectIdGuard)
export class ProjectsController {
  private readonly logger = new Logger(ProjectsController.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly generationService: GenerationService,
    private readonly mimeService: MimeService,
  ) {}

  @Post()
  @ApiOperation({ summary: 'Создать новый проект' })
  @ApiBody({
    type: CreateProjectDto,
    description: 'Данные для создания проекта',
  })
  @ApiResponse({
    status: 201,
    description: 'Проект успешно создан',
    type: CreateProjectResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({
    status: 409,
    description: 'Проект с таким ID уже существует или ID зарезервирован',
  })
  async createProject(
    @Body() dto: CreateProjectDto,
  ): Promise<CreateProjectResponseDto> {
    const project = await this.projectsService.createProject(dto);
    return project as unknown as CreateProjectResponseDto;
  }

  @Get()
  @ApiOperation({ summary: 'Получить список всех проектов' })
  @ApiResponse({
    status: 200,
    description: 'Список проектов',
    type: ProjectListResponseDto,
  })
  async getAllProjects(): Promise<ProjectListResponseDto> {
    const projects = await this.projectsService.getAllProjects();
    return { projects };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Получить проект по ID' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Проект найден',
    type: ProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  async getProject(@Param('id') id: string): Promise<ProjectResponseDto> {
    return this.projectsService.getProject(id);
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Удалить проект' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Проект удалён',
    type: DeleteProjectResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  async deleteProject(
    @Param('id') id: string,
  ): Promise<DeleteProjectResponseDto> {
    await this.projectsService.deleteProject(id);
    return { message: 'Project deleted successfully' };
  }

  @Post(':id/results')
  @ApiOperation({ summary: 'Загрузить результаты Allure (отдельные файлы)' })
  @ApiParam({ name: 'id', description: 'ID проекта' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        files: {
          type: 'array',
          items: { type: 'string', format: 'binary' },
          description: 'Файлы allure-results',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'Результаты загружены, генерация запущена',
    type: UploadResultsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные файлы' })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @UseInterceptors(
    FilesInterceptor('files', UPLOAD_LIMITS.FILES.MAX_COUNT, {
      limits: { fileSize: UPLOAD_LIMITS.FILES.MAX_SIZE },
    }),
  )
  async uploadResults(
    @Param('id') id: string,
    @UploadedFiles() files: Express.Multer.File[],
    @Res() res: Response,
  ): Promise<Response<UploadResultsResponseDto>> {
    if (!files || files.length === 0) {
      throw new BadRequestException('No files uploaded');
    }

    this.projectsService.validateAllureResults(files);
    const result = await this.projectsService.addResult(id, files);

    this.generationService
      .startGeneration(id, result.id)
      .catch((err: Error) => {
        this.logger.error(
          `Auto-generation failed for project ${id}: ${err.message}`,
        );
      });

    return res.status(HttpStatus.CREATED).json({
      result: {
        id: result.id,
        timestamp: result.timestamp,
        status: result.status,
      },
      message: 'Report generation started automatically',
    });
  }

  @Post(':id/results/zip')
  @ApiOperation({ summary: 'Загрузить результаты Allure (ZIP архив)' })
  @ApiParam({ name: 'id', description: 'ID проекта' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'ZIP архив с allure-results',
        },
      },
    },
  })
  @ApiResponse({
    status: 201,
    description: 'ZIP распакован, результаты загружены, генерация запущена',
    type: UploadResultsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректный ZIP файл' })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: UPLOAD_LIMITS.ZIP.MAX_SIZE },
    }),
  )
  async uploadResultsZip(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Res() res: Response,
  ): Promise<Response<UploadResultsResponseDto>> {
    if (!file) {
      throw new BadRequestException('No ZIP file uploaded');
    }

    if (!file.originalname.endsWith('.zip')) {
      throw new BadRequestException('Only ZIP files are accepted');
    }

    const { result, filesCount } = await this.projectsService.addResultFromZip(
      id,
      file.buffer,
    );

    this.generationService
      .startGeneration(id, result.id)
      .catch((err: Error) => {
        this.logger.error(
          `Auto-generation failed for project ${id}: ${err.message}`,
        );
      });

    return res.status(HttpStatus.CREATED).json({
      result: {
        id: result.id,
        timestamp: result.timestamp,
        status: result.status,
      },
      filesExtracted: filesCount,
      message: 'ZIP extracted, report generation started automatically',
    });
  }

  @Post(':id/send-results')
  @ApiOperation({ summary: 'Отправить результаты Allure (JSON + base64)' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiResponse({
    status: 201,
    description: 'Результаты загружены',
    type: SendResultsResponseDto,
  })
  @ApiResponse({ status: 400, description: 'Некорректные данные' })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  async sendResults(
    @Param('id') id: string,
    @Body() dto: SendResultsDto,
  ): Promise<SendResultsResponseDto> {
    if (!dto.results || dto.results.length === 0) {
      throw new BadRequestException('No results provided');
    }

    const firstFile = dto.results[0];
    const isZip = firstFile.file_name.endsWith('.zip');

    let result: ProjectResult;

    if (isZip && dto.results.length === 1) {
      const zipBuffer = Buffer.from(firstFile.content_base64, 'base64');
      const extractResult = await this.projectsService.addResultFromZip(
        id,
        zipBuffer,
      );
      result = extractResult.result;
    } else {
      const files: Express.Multer.File[] = dto.results.map(
        (item: ResultFileDto) => {
          const buffer = Buffer.from(item.content_base64, 'base64');
          const file: Express.Multer.File = {
            originalname: item.file_name,
            buffer: buffer,
            size: buffer.length,
            fieldname: 'files',
            encoding: '7bit',
            mimetype: this.mimeService.getMimeType(item.file_name),
            destination: '',
            filename: item.file_name,
            path: '',
            stream: Readable.from(buffer),
          };
          return file;
        },
      );

      this.projectsService.validateAllureResults(files);
      result = await this.projectsService.addResult(id, files);
    }

    this.generationService
      .startGeneration(id, result.id)
      .catch((err: Error) => {
        this.logger.error(
          `Auto-generation failed for project ${id}: ${err.message}`,
        );
      });

    return {
      result: {
        id: result.id,
        timestamp: result.timestamp,
        status: result.status,
      },
      message: 'Results uploaded, report generation started automatically',
    };
  }

  @Get(':id/results')
  @ApiOperation({ summary: 'Получить список результатов' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Список результатов',
    type: [ResultResponseDto],
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  async getResults(@Param('id') id: string): Promise<ResultResponseDto[]> {
    return this.projectsService.getResults(id);
  }

  @Get(':id/results/:resultId')
  @ApiOperation({ summary: 'Получить результат по ID' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiParam({ name: 'resultId', description: 'UUID результата' })
  @ApiResponse({
    status: 200,
    description: 'Результат найден',
    type: ResultResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Проект или результат не найден' })
  async getResult(
    @Param('id') id: string,
    @Param('resultId') resultId: string,
  ): Promise<ResultResponseDto> {
    return this.projectsService.getResult(id, resultId);
  }

  @Get(':id/reports')
  @ApiOperation({ summary: 'Получить список отчётов' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Список отчётов',
    type: ReportsListResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Проект не найден' })
  async getReports(@Param('id') id: string): Promise<ReportsListResponseDto> {
    const project = await this.projectsService.getProject(id);
    const reports = project.results
      .filter(
        (r: ProjectResult) => r.status === 'completed' && r.generatedReport,
      )
      .map((r: ProjectResult) => ({
        resultId: r.id,
        timestamp: r.timestamp,
        status: r.status,
        reportUrl: `/reports/${id}/${r.id}/`,
      }));
    return { reports };
  }

  @Get(':id/reports/latest')
  @ApiOperation({ summary: 'Получить последний отчёт' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiResponse({
    status: 200,
    description: 'Последний отчёт',
    type: LatestReportResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Отчёты не найдены' })
  async getLatestReport(
    @Param('id') id: string,
    @Res() res: Response,
  ): Promise<Response<LatestReportResponseDto>> {
    const project = await this.projectsService.getProject(id);
    const completedReports = project.results
      .filter(
        (r: ProjectResult) => r.status === 'completed' && r.generatedReport,
      )
      .sort(
        (a: ProjectResult, b: ProjectResult) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    if (completedReports.length === 0) {
      return res.status(HttpStatus.NOT_FOUND).json({
        message: 'No completed reports found for this project',
      } as any);
    }

    const latest = completedReports[0];
    return res.json({
      resultId: latest.id,
      timestamp: latest.timestamp,
      reportUrl: `/reports/${id}/${latest.id}/`,
    });
  }

  @Delete(':id/reports/:resultId')
  @ApiOperation({ summary: 'Удалить отчёт' })
  @ApiParam({ name: 'id', description: 'UUID проекта' })
  @ApiParam({ name: 'resultId', description: 'UUID результата' })
  @ApiResponse({
    status: 200,
    description: 'Отчёт удалён',
    type: DeleteReportResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Проект, отчёт или результат не найден',
  })
  async deleteReport(
    @Param('id') id: string,
    @Param('resultId') resultId: string,
  ): Promise<DeleteReportResponseDto> {
    const project = await this.projectsService.getProject(id);
    const result = project.results.find(
      (r: ProjectResult) => r.id === resultId,
    );

    if (!result || !result.generatedReport) {
      throw new BadRequestException('Report not found');
    }

    await fs.rm(result.generatedReport, { recursive: true, force: true });

    await this.projectsService.updateResult(project.id, resultId, {
      generatedReport: undefined,
      status: 'pending',
    });

    return { message: 'Report deleted successfully' };
  }
}
