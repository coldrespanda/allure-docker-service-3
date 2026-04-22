import {
  Injectable,
  NotFoundException,
  ConflictException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';
import { CreateProjectDto } from './dto/create-project.dto';
import { Project, ProjectResult } from './interfaces/project.interface';
import { MimeService } from '../common/mime.service';
import { ZipValidatorService } from '../common/zip-validator.service';
import { Readable } from 'stream';

@Injectable()
export class ProjectsService {
  private readonly logger = new Logger(ProjectsService.name);
  private dataPath: string;
  private projects: Map<string, Project> = new Map();

  constructor(
    private configService: ConfigService,
    private mimeService: MimeService,
    private zipValidator: ZipValidatorService,
  ) {
    this.dataPath = this.configService.get<string>('dataPath') || './data';
    void this.initializeStorage();
  }

  private async initializeStorage(): Promise<void> {
    const projectsPath = path.join(this.dataPath, 'projects');
    try {
      await fs.mkdir(projectsPath, { recursive: true });
      await this.loadProjectsFromDisk();
    } catch (error) {
      this.logger.error('Failed to initialize storage:', error);
    }
  }

  private async loadProjectsFromDisk(): Promise<void> {
    const projectsPath = path.join(this.dataPath, 'projects');
    try {
      const entries = await fs.readdir(projectsPath, { withFileTypes: true });

      for (const entry of entries) {
        if (entry.isDirectory()) {
          const projectPath = path.join(projectsPath, entry.name);
          const metadataPath = path.join(projectPath, 'metadata.json');

          try {
            const metadata = await fs.readFile(metadataPath, 'utf-8');
            const project = JSON.parse(metadata) as Project;
            this.projects.set(project.id, project);
          } catch (error) {
            this.logger.warn(`No metadata for project ${entry.name}`, error);
          }
        }
      }
    } catch (error) {
      this.logger.error('Failed to load projects:', error);
    }
  }

  private async saveProjectMetadata(project: Project): Promise<void> {
    const projectPath = path.join(this.dataPath, 'projects', project.id);
    const metadataPath = path.join(projectPath, 'metadata.json');

    await fs.mkdir(projectPath, { recursive: true });
    await fs.writeFile(metadataPath, JSON.stringify(project, null, 2));
  }

  async createProject(dto: CreateProjectDto): Promise<Project> {
    if (dto.id === 'default') {
      throw new ConflictException('Project ID "default" is reserved');
    }

    if (this.projects.has(dto.id)) {
      throw new ConflictException(`Project with ID "${dto.id}" already exists`);
    }

    const project: Project = {
      id: dto.id,
      name: dto.name || dto.id,
      description: dto.description,
      logoUrl: dto.logoUrl,
      createdAt: new Date(),
      updatedAt: new Date(),
      results: [],
    };

    this.projects.set(project.id, project);
    await this.saveProjectMetadata(project);
    this.logger.log(`Project created: ${project.id} (${project.name})`);

    return project;
  }

  async getAllProjects(): Promise<Project[]> {
    return Promise.resolve(Array.from(this.projects.values()));
  }

  async getProject(id: string): Promise<Project> {
    const project = this.projects.get(id);
    if (!project) {
      return Promise.reject(
        new NotFoundException(`Project with ID ${id} not found`),
      );
    }
    return Promise.resolve(project);
  }

  async deleteProject(id: string): Promise<void> {
    const project = await this.getProject(id);
    const projectPath = path.join(this.dataPath, 'projects', project.id);

    await fs.rm(projectPath, { recursive: true, force: true });
    this.projects.delete(id);
  }

  async addResult(
    projectId: string,
    files: Express.Multer.File[],
  ): Promise<ProjectResult> {
    const project = await this.getProject(projectId);

    const resultId = uuidv4();
    const resultPath = path.join(
      this.dataPath,
      'projects',
      project.id,
      'results',
      resultId,
    );

    await fs.mkdir(resultPath, { recursive: true });

    for (const file of files) {
      const filePath = path.join(resultPath, file.originalname);
      await fs.writeFile(filePath, file.buffer);
    }

    const result: ProjectResult = {
      id: resultId,
      timestamp: new Date().toISOString(),
      path: resultPath,
      status: 'pending',
    };

    project.results.push(result);
    project.updatedAt = new Date();
    await this.saveProjectMetadata(project);

    return result;
  }

  async addResultFromZip(
    projectId: string,
    zipBuffer: Buffer,
  ): Promise<{ result: ProjectResult; filesCount: number }> {
    const { entries } = this.zipValidator.validate(zipBuffer);

    const files: Express.Multer.File[] = [];

    for (const entry of entries) {
      if (entry.isDirectory) continue;

      const buffer = entry.getData();
      files.push({
        originalname: entry.entryName,
        buffer: buffer,
        size: buffer.length,
        fieldname: 'files',
        encoding: '7bit',
        mimetype: this.mimeService.getMimeType(entry.entryName),
        destination: '',
        filename: entry.entryName,
        path: '',
        stream: Readable.from(buffer),
      } as Express.Multer.File);
    }

    this.validateAllureResults(files);
    const result = await this.addResult(projectId, files);

    return { result, filesCount: files.length };
  }

  validateAllureResults(files: Express.Multer.File[]): void {
    const jsonFiles = files.filter((f) => f.originalname.endsWith('.json'));
    const attachmentsCount = files.filter((f) =>
      f.originalname.match(/.*-attachment\.\w+$/i),
    ).length;
    const hasEnvironment = files.some(
      (f) => f.originalname === 'environment.properties',
    );

    this.logger.log(
      `Allure results: ${jsonFiles.length} JSON, ${attachmentsCount} attachments, environment: ${hasEnvironment}`,
    );
  }

  async getResults(projectId: string): Promise<ProjectResult[]> {
    const project = await this.getProject(projectId);
    return project.results;
  }

  async getResult(projectId: string, resultId: string): Promise<ProjectResult> {
    const project = await this.getProject(projectId);
    const result = project.results.find((r) => r.id === resultId);

    if (!result) {
      throw new NotFoundException(`Result with ID ${resultId} not found`);
    }

    return result;
  }

  async updateResult(
    projectId: string,
    resultId: string,
    updates: Partial<ProjectResult>,
  ): Promise<ProjectResult> {
    const project = await this.getProject(projectId);
    const resultIndex = project.results.findIndex(
      (r: ProjectResult) => r.id === resultId,
    );

    if (resultIndex === -1) {
      throw new NotFoundException(`Result with ID ${resultId} not found`);
    }

    project.results[resultIndex] = {
      ...project.results[resultIndex],
      ...updates,
    };

    project.updatedAt = new Date();
    await this.saveProjectMetadata(project);

    return project.results[resultIndex];
  }
}
