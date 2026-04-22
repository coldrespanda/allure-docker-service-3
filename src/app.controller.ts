import { Controller, Get, Logger, Res, Req } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { AppService } from './app.service';
import {
  HealthResponseDto,
  AllureVersionResponseDto,
  RootResponseDto,
} from './app.dto';

@ApiTags('system')
@Controller()
export class AppController {
  private readonly logger = new Logger(AppController.name);

  constructor(private readonly appService: AppService) {}

  @Get('health')
  @ApiOperation({ summary: 'Проверка здоровья сервиса' })
  @ApiResponse({
    status: 200,
    description: 'Сервис работает',
    type: HealthResponseDto,
  })
  health(): HealthResponseDto {
    return this.appService.getHealth();
  }

  @Get('allure-version')
  @ApiOperation({ summary: 'Получить версию Allure CLI' })
  @ApiResponse({ status: 200, description: 'Версия получена' })
  @ApiResponse({
    status: 500,
    description: 'Allure не установлен',
    type: AllureVersionResponseDto,
  })
  async allureVersion(): Promise<AllureVersionResponseDto> {
    return this.appService.getAllureVersion();
  }

  @Get()
  @ApiOperation({ summary: 'Корневой эндпоинт' })
  @ApiResponse({
    status: 200,
    description: 'Веб-интерфейс (HTML) или информация об API (JSON)',
    type: RootResponseDto,
  })
  getRoot(@Req() req: Request, @Res() res: Response): void {
    const acceptHeader = req.headers.accept || '';
    const indexPath = this.appService.serveIndexHtml();

    if (acceptHeader.includes('application/json') && !indexPath) {
      const rootData = this.appService.getRoot();
      res.json(rootData);
      return;
    }

    if (indexPath && !acceptHeader.includes('application/json')) {
      res.sendFile(indexPath);
      return;
    }

    const rootData = this.appService.getRoot();
    res.json(rootData);
  }
}
