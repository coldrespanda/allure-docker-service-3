import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import archiver from 'archiver';
import { Response } from 'express';
import { ProjectsService } from '../projects/projects.service';

export interface FileInfo {
  name: string;
  type: string;
  size?: number;
  modified?: Date;
  children?: FileInfo[];
}

@Injectable()
export class ExportService {
  private readonly logger = new Logger(ExportService.name);
  private dataPath: string;

  constructor(
    private configService: ConfigService,
    private projectsService: ProjectsService,
  ) {
    this.dataPath = this.configService.get<string>('dataPath') || './data';
  }

  async exportReportToZip(
    projectId: string,
    resultId: string,
    res: Response,
  ): Promise<void> {
    this.logger.log(
      `Starting report export for project ${projectId}, result ${resultId}`,
    );

    const project = await this.projectsService.getProject(projectId);
    const result = project.results.find((r) => r.id === resultId);

    if (!result || result.status !== 'completed' || !result.generatedReport) {
      throw new NotFoundException('Report not found or not completed');
    }

    const reportPath = result.generatedReport;
    const zipName = `${project.name}_report_${result.timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(zipName)}"`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      this.logger.error(
        `Archive error for project ${projectId}, result ${resultId}:`,
        err,
      );
      if (!res.headersSent) {
        res.status(500).json({ error: 'Archive creation failed' });
      }
    });

    archive.pipe(res);
    archive.directory(reportPath, false);
    await archive.finalize();

    this.logger.log(
      `Report export completed for project ${projectId}, result ${resultId}`,
    );
  }

  async exportResultsToZip(
    projectId: string,
    resultId: string,
    res: Response,
  ): Promise<void> {
    this.logger.log(
      `Starting results export for project ${projectId}, result ${resultId}`,
    );

    const result = await this.projectsService.getResult(projectId, resultId);

    if (!result) {
      throw new NotFoundException('Result not found');
    }

    const resultsPath = result.path;
    const zipName = `allure_results_${result.timestamp}.zip`;

    res.setHeader('Content-Type', 'application/zip');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${encodeURIComponent(zipName)}"`,
    );

    const archive = archiver('zip', { zlib: { level: 9 } });

    archive.on('error', (err) => {
      this.logger.error(
        `Archive error for results ${projectId}/${resultId}:`,
        err,
      );
      if (!res.headersSent) {
        res.status(500).json({ error: 'Archive creation failed' });
      }
    });

    archive.pipe(res);
    archive.directory(resultsPath, false);
    await archive.finalize();

    this.logger.log(
      `Results export completed for project ${projectId}, result ${resultId}`,
    );
  }

  async getReportInfo(projectId: string, resultId: string) {
    this.logger.log(
      `Getting report info for project ${projectId}, result ${resultId}`,
    );

    const project = await this.projectsService.getProject(projectId);
    const result = project.results.find((r) => r.id === resultId);

    if (!result || !result.generatedReport) {
      throw new NotFoundException('Report not found');
    }

    const reportPath = result.generatedReport;
    const files = await this.getDirectoryStructure(reportPath);

    return {
      resultId: result.id,
      timestamp: result.timestamp,
      status: result.status,
      size: await this.getDirectorySize(reportPath),
      files: files,
    };
  }

  private async getDirectoryStructure(dirPath: string): Promise<FileInfo[]> {
    const structure: FileInfo[] = [];
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          structure.push({
            name: item.name,
            type: 'directory',
            children: await this.getDirectoryStructure(itemPath),
          });
        } else {
          const stats = await fs.stat(itemPath);
          structure.push({
            name: item.name,
            type: 'file',
            size: stats.size,
            modified: stats.mtime,
          });
        }
      }
    } catch (error) {
      this.logger.error(`Error reading directory ${dirPath}:`, error);
    }
    return structure;
  }

  private async getDirectorySize(dirPath: string): Promise<number> {
    let size = 0;
    try {
      const items = await fs.readdir(dirPath, { withFileTypes: true });

      for (const item of items) {
        const itemPath = path.join(dirPath, item.name);
        if (item.isDirectory()) {
          size += await this.getDirectorySize(itemPath);
        } else {
          const stats = await fs.stat(itemPath);
          size += stats.size;
        }
      }
    } catch (error) {
      this.logger.error(`Error calculating size for ${dirPath}:`, error);
    }
    return size;
  }
}
