import {
  Injectable,
  CanActivate,
  ExecutionContext,
  BadRequestException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';

@Injectable()
export class ProjectIdGuard implements CanActivate {
  private readonly logger = new Logger(ProjectIdGuard.name);
  private readonly projectIdPattern = /^[a-z0-9-]+$/;

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();

    let projectId = request.params['projectId'] || request.params['id'];

    if (!projectId) {
      return true;
    }

    if (Array.isArray(projectId)) {
      projectId = projectId[0];
    }

    if (!projectId || !this.projectIdPattern.test(projectId)) {
      this.logger.warn(`Invalid project ID format: ${projectId}`);
      throw new BadRequestException(
        'Invalid project ID format. Use only lowercase letters, numbers, and hyphens',
      );
    }

    return true;
  }
}
