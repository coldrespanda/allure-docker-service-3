import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import { promisify } from 'util';
import {
  HealthResponseDto,
  AllureVersionResponseDto,
  RootResponseDto,
} from './app.dto';
import * as path from 'path';
import * as fs from 'fs';

const execAsync = promisify(exec);

@Injectable()
export class AppService {
  private readonly logger = new Logger(AppService.name);

  getHealth(): HealthResponseDto {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'allure3',
    };
  }

  async getAllureVersion(): Promise<AllureVersionResponseDto> {
    try {
      const { stdout } = await execAsync('npx allure --version');
      const version = stdout.trim();

      this.logger.log(`Allure version detected: ${version}`);

      return {
        version,
        success: true,
        installed: true,
      };
    } catch (error) {
      this.logger.error(`Failed to get Allure version: ${error}`);

      const errorMessage =
        error instanceof Error ? error.message : String(error);

      return {
        version: null,
        success: false,
        installed: false,
        error: errorMessage,
        hint: 'Make sure allure is installed via npm install -D allure',
      };
    }
  }

  getRoot(): RootResponseDto | null {
    return {
      message: 'Allure 3 Report Service API',
      version: '3.0.0',
      endpoints: {
        health: '/health',
        allureVersion: '/allure-version',
        projects: '/api/projects',
        generation: '/api/generation',
        export: '/api/export',
        docs: '/api/docs',
      },
      webInterface: 'http://localhost:3000',
    };
  }

  serveIndexHtml(): string | null {
    const indexPath = path.join(process.cwd(), 'public', 'index.html');
    if (fs.existsSync(indexPath)) {
      return indexPath;
    }
    return null;
  }
}
