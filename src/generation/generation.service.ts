import {
  Injectable,
  Logger,
  NotFoundException,
  BadRequestException,
  OnApplicationShutdown,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as path from 'path';
import { promises as fs } from 'fs';
import { v4 as uuidv4 } from 'uuid';
import PQueue from 'p-queue';
import { ProjectsService } from '../projects/projects.service';
import { AllureConfigService } from './allure-config.service';
import { GenerationTask } from './interfaces/task.interface';

const execAsync = promisify(exec);

export interface TaskResponse {
  id: string;
  projectId: string;
  resultId: string;
  status: string;
  outputPath?: string;
  error?: string;
  createdAt: Date;
  updatedAt: Date;
}

@Injectable()
export class GenerationService implements OnApplicationShutdown {
  private readonly logger = new Logger(GenerationService.name);
  private tasks: Map<string, GenerationTask> = new Map();
  private dataPath: string;
  private generationTimeout: number;
  private queue: PQueue;
  private readonly TASK_TTL_MS = 3600000;
  private readonly MAX_TASKS = 100;
  private cleanupInterval: NodeJS.Timeout;

  constructor(
    private configService: ConfigService,
    private projectsService: ProjectsService,
    private allureConfigService: AllureConfigService,
  ) {
    this.dataPath = this.configService.get<string>('dataPath') || './data';
    this.generationTimeout =
      this.configService.get<number>('generation.timeout') || 300000;

    const maxConcurrent =
      this.configService.get<number>('generation.maxConcurrent') || 3;
    this.queue = new PQueue({ concurrency: maxConcurrent });

    this.cleanupInterval = setInterval(() => this.cleanupOldTasks(), 600000);

    this.logger.log(
      `Generation queue initialized with concurrency: ${maxConcurrent}`,
    );
  }

  private cleanupOldTasks(): void {
    const now = new Date();
    const toDelete: string[] = [];

    for (const [id, task] of this.tasks) {
      if (task.status === 'completed' || task.status === 'failed') {
        const age = now.getTime() - task.updatedAt.getTime();
        if (age > this.TASK_TTL_MS) {
          toDelete.push(id);
        }
      }
    }

    for (const id of toDelete) {
      this.tasks.delete(id);
    }

    if (this.tasks.size > this.MAX_TASKS) {
      const sorted = Array.from(this.tasks.entries())
        .filter(
          (entry) =>
            entry[1].status === 'completed' || entry[1].status === 'failed',
        )
        .sort((a, b) => a[1].updatedAt.getTime() - b[1].updatedAt.getTime());

      const toRemove = sorted.slice(0, this.tasks.size - this.MAX_TASKS);
      for (const [id] of toRemove) {
        this.tasks.delete(id);
      }
    }

    if (toDelete.length > 0) {
      this.logger.log(`Cleaned up ${toDelete.length} old tasks`);
    }
  }

  async startGeneration(
    projectId: string,
    resultId: string,
  ): Promise<TaskResponse> {
    const result = await this.projectsService.getResult(projectId, resultId);

    if (!result) {
      throw new NotFoundException(`Result ${resultId} not found`);
    }

    if (result.status === 'processing') {
      throw new BadRequestException('Result is already being processed');
    }

    if (result.status === 'completed') {
      throw new BadRequestException('Report already generated for this result');
    }

    await this.projectsService.updateResult(projectId, resultId, {
      status: 'processing',
    });

    const task: GenerationTask = {
      id: uuidv4(),
      projectId,
      resultId,
      status: 'pending',
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.tasks.set(task.id, task);

    this.queue
      .add(() => this.processGeneration(task, result.path))
      .catch((error) => {
        this.logger.error(`Queue task ${task.id} failed:`, error);
      });

    const queueSize = this.queue.size + this.queue.pending;
    this.logger.log(
      `Task ${task.id} queued. Queue size: ${queueSize}, Active: ${this.queue.pending}`,
    );

    return this.mapToResponse(task);
  }

  private async processGeneration(
    task: GenerationTask,
    resultsPath: string,
  ): Promise<void> {
    let configPath: string | undefined;

    try {
      task.status = 'processing';
      task.updatedAt = new Date();
      await this.projectsService.updateResult(task.projectId, task.resultId, {
        status: 'processing',
      });

      const project = await this.projectsService.getProject(task.projectId);

      const config = await this.allureConfigService.generateConfig(
        task.projectId,
        project.name,
        project.logoUrl,
      );
      configPath = config.configPath;

      const finalOutputPath = path.join(
        this.dataPath,
        'projects',
        task.projectId,
        'reports',
        task.resultId,
      );

      await fs.mkdir(finalOutputPath, { recursive: true });

      const escapePath = (p: string): string => {
        if (process.platform === 'win32') {
          return `"${p.replace(/\\/g, '\\\\')}"`;
        }
        return `"${p}"`;
      };

      const command = `npx allure generate ${escapePath(resultsPath)} -o ${escapePath(finalOutputPath)} --config ${escapePath(configPath)}`;

      this.logger.log(`[${task.id}] Executing: npx allure generate`);

      const { stdout, stderr } = await execAsync(command, {
        timeout: this.generationTimeout,
        maxBuffer: 50 * 1024 * 1024,
      });

      if (stderr) {
        this.logger.warn(`[${task.id}] Allure stderr: ${stderr}`);
      }
      if (stdout) {
        this.logger.debug(`[${task.id}] Allure stdout: ${stdout}`);
      }

      task.status = 'completed';
      task.outputPath = finalOutputPath;
      task.updatedAt = new Date();

      await this.projectsService.updateResult(task.projectId, task.resultId, {
        status: 'completed',
        generatedReport: finalOutputPath,
      });

      await this.updateLatestSymlink(
        task.projectId,
        finalOutputPath,
        task.resultId,
      );
      await this.cleanupOldReports(task.projectId);

      this.logger.log(
        `[${task.id}] Report generated successfully at ${finalOutputPath}`,
      );
    } catch (error) {
      const err = error as Error;
      this.logger.error(`[${task.id}] Generation error: ${err.message}`);

      task.status = 'failed';
      task.error = err.message;
      task.updatedAt = new Date();

      await this.projectsService.updateResult(task.projectId, task.resultId, {
        status: 'failed',
        error: err.message,
      });
    } finally {
      if (configPath) {
        await this.allureConfigService.cleanupConfig(configPath);
      }
    }
  }

  private async updateLatestSymlink(
    projectId: string,
    reportPath: string,
    resultId: string,
  ): Promise<void> {
    const reportsDir = path.join(
      this.dataPath,
      'projects',
      projectId,
      'reports',
    );
    const latestFile = path.join(reportsDir, 'latest.json');

    const latestData = {
      resultId: resultId,
      reportPath: reportPath,
      updatedAt: new Date().toISOString(),
    };

    try {
      await fs.mkdir(reportsDir, { recursive: true });
      await fs.writeFile(latestFile, JSON.stringify(latestData, null, 2));
      this.logger.log(`[${resultId}] Updated latest.json`);
    } catch (error) {
      this.logger.warn(`Failed to update latest.json: ${error}`);
    }
  }

  private async cleanupOldReports(projectId: string): Promise<void> {
    const project = await this.projectsService.getProject(projectId);
    const keepReportsCount =
      this.configService.get<number>('generation.keepReportsCount') || 10;

    const completedReports = project.results
      .filter((r) => r.status === 'completed' && r.generatedReport)
      .sort(
        (a, b) =>
          new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
      );

    if (completedReports.length <= keepReportsCount) {
      return;
    }

    const toDelete = completedReports.slice(keepReportsCount);
    this.logger.log(
      `Cleaning up ${toDelete.length} old reports for project ${projectId}`,
    );

    for (const report of toDelete) {
      if (report.generatedReport) {
        try {
          await fs.rm(report.generatedReport, { recursive: true, force: true });
          this.logger.debug(
            `Deleted report directory: ${report.generatedReport}`,
          );
        } catch (error) {
          this.logger.error(`Failed to delete report ${report.id}:`, error);
        }
      }

      try {
        await fs.rm(report.path, { recursive: true, force: true });
        this.logger.debug(`Deleted results directory: ${report.path}`);
      } catch (error) {
        this.logger.error(`Failed to delete results ${report.id}:`, error);
      }

      const resultIndex = project.results.findIndex((r) => r.id === report.id);
      if (resultIndex !== -1) {
        project.results.splice(resultIndex, 1);
      }
    }

    const projectPath = path.join(this.dataPath, 'projects', projectId);
    const metadataPath = path.join(projectPath, 'metadata.json');
    await fs.writeFile(metadataPath, JSON.stringify(project, null, 2));
  }

  getTask(taskId: string): TaskResponse {
    const task = this.tasks.get(taskId);
    if (!task) {
      throw new NotFoundException(`Task ${taskId} not found`);
    }
    return this.mapToResponse(task);
  }

  getAllTasks(projectId?: string): TaskResponse[] {
    const tasks = Array.from(this.tasks.values());
    const filtered = projectId
      ? tasks.filter((t) => t.projectId === projectId)
      : tasks;
    return filtered.map((t) => this.mapToResponse(t));
  }

  private mapToResponse(task: GenerationTask): TaskResponse {
    return {
      id: task.id,
      projectId: task.projectId,
      resultId: task.resultId,
      status: task.status,
      outputPath: task.outputPath,
      error: task.error,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
    };
  }

  async onApplicationShutdown(signal: string): Promise<void> {
    const SHUTDOWN_TIMEOUT_MS = 30000;

    this.logger.log(
      `Received ${signal}, waiting for ${this.queue.pending} active generations to complete...`,
    );

    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.queue.pause();

    const shutdownPromise = new Promise<void>((resolve) => {
      const checkInterval = setInterval(() => {
        if (this.queue.pending === 0) {
          clearInterval(checkInterval);
          resolve();
        }
      }, 500);
    });

    const timeoutPromise = new Promise<void>((resolve) => {
      setTimeout(() => {
        this.logger.warn(
          `Shutdown timeout reached, forcing exit with ${this.queue.pending} pending tasks`,
        );
        resolve();
      }, SHUTDOWN_TIMEOUT_MS);
    });

    await Promise.race([shutdownPromise, timeoutPromise]);

    this.queue.clear();
    this.logger.log('Shutdown complete');
  }
}
