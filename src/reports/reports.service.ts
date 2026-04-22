import {
  Injectable,
  NotFoundException,
  Logger,
  ForbiddenException,
} from '@nestjs/common';
import { ProjectsService } from '../projects/projects.service';
import { MimeService } from '../common/mime.service';
import * as path from 'path';
import { promises as fs } from 'fs';
import { Request } from 'express';

interface LatestReportData {
  resultId: string;
  reportPath: string;
  updatedAt: string;
}

export interface FileResponse {
  filePath: string;
  contentType: string;
  cacheMaxAge: number;
}

@Injectable()
export class ReportsService {
  private readonly logger = new Logger(ReportsService.name);

  constructor(
    private readonly projectsService: ProjectsService,
    private readonly mimeService: MimeService,
  ) {}

  async getLatestResultId(projectId: string): Promise<string> {
    const reportsDir = path.join(
      process.cwd(),
      'data',
      'projects',
      projectId,
      'reports',
    );
    const latestFile = path.join(reportsDir, 'latest.json');

    try {
      const latestDataRaw = await fs.readFile(latestFile, 'utf-8');
      const parsed = JSON.parse(latestDataRaw) as LatestReportData;
      return parsed.resultId;
    } catch {
      throw new NotFoundException('No reports found for this project');
    }
  }

  extractFilePath(req: Request): string {
    const originalUrl = req.originalUrl.split('?')[0];
    const parts = originalUrl.split('/');

    if (parts.length <= 4) {
      return '';
    }

    const filePath = parts.slice(4).join('/');

    if (!filePath || filePath === '.' || filePath === '/') {
      return '';
    }

    let normalized = path.normalize(filePath);

    if (normalized.includes('..') || normalized.includes(':\\')) {
      this.logger.warn(`Path traversal blocked: ${filePath}`);
      return '';
    }

    if (normalized.startsWith('/')) {
      normalized = normalized.substring(1);
    }

    return normalized;
  }

  async getReportPath(projectId: string, resultId: string): Promise<string> {
    const project = await this.projectsService.getProject(projectId);
    const result = project.results.find((r) => r.id === resultId);

    if (!result) {
      throw new NotFoundException(`Result ${resultId} not found`);
    }

    if (result.status !== 'completed' || !result.generatedReport) {
      throw new NotFoundException(
        `Report for result ${resultId} not generated or not completed`,
      );
    }

    const reportPath = result.generatedReport;

    try {
      await fs.access(reportPath);
      return reportPath;
    } catch {
      throw new NotFoundException(
        `Report directory not found on disk: ${reportPath}`,
      );
    }
  }

  async getReportFile(
    projectId: string,
    resultId: string,
    requestedPath: string,
  ): Promise<FileResponse> {
    this.logger.debug(`Raw requestedPath: "${requestedPath}"`);
    this.logger.debug(
      `Getting report file: ${projectId}/${resultId}/${requestedPath || 'index.html'}`,
    );

    const reportBasePath = await this.getReportPath(projectId, resultId);
    const filePath =
      requestedPath && requestedPath.length > 0 ? requestedPath : 'index.html';

    const fullPath = path.join(reportBasePath, filePath);
    const normalizedPath = path.normalize(fullPath);

    if (!normalizedPath.startsWith(reportBasePath)) {
      this.logger.warn(`Path traversal attempt blocked: ${normalizedPath}`);
      throw new ForbiddenException('Invalid path');
    }

    let targetPath = normalizedPath;
    let isDirectory = false;

    try {
      const stat = await fs.stat(targetPath);
      isDirectory = stat.isDirectory();
    } catch {
      throw new NotFoundException(`File not found: ${filePath}`);
    }

    if (isDirectory) {
      targetPath = path.join(targetPath, 'index.html');
      try {
        await fs.access(targetPath);
      } catch {
        throw new NotFoundException('Directory has no index.html');
      }
    }

    const ext = path.extname(targetPath).toLowerCase();
    const contentType = this.mimeService.getMimeTypeByExt(ext);
    const cacheMaxAge = this.mimeService.getCacheMaxAge(ext);

    return {
      filePath: path.resolve(targetPath),
      contentType,
      cacheMaxAge,
    };
  }

  async getLatestReportFile(
    projectId: string,
    requestedPath: string,
  ): Promise<FileResponse> {
    this.logger.debug(
      `Getting latest report file: ${projectId}/${requestedPath || 'index.html'}`,
    );
    const latestResultId = await this.getLatestResultId(projectId);
    return this.getReportFile(projectId, latestResultId, requestedPath);
  }

  async getRedirectUrl(
    projectId: string,
    reportType: 'awesome-by-behavior' | 'awesome-by-suite' | 'dashboard',
    subPath: string,
  ): Promise<string> {
    this.logger.debug(`Redirecting ${reportType} for project ${projectId}`);
    this.logger.debug(`subPath: "${subPath}"`);
    const resultId = await this.getLatestResultId(projectId);
    const url = `/reports/${projectId}/${resultId}/${reportType}/${subPath}`;
    this.logger.debug(`Generated URL: ${url}`);
    return url;
  }
}
