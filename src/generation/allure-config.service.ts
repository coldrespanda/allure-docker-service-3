import { Injectable, Logger } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AllureConfigService {
  private readonly logger = new Logger(AllureConfigService.name);

  private readonly categories = [
    {
      name: 'Unit Tests',
      traceRegex: 'unit',
      matchedStatuses: ['passed', 'failed', 'broken', 'skipped'],
    },
    {
      name: 'Integration Tests',
      traceRegex: 'integration',
      matchedStatuses: ['passed', 'failed', 'broken', 'skipped'],
    },
    {
      name: 'API Tests',
      traceRegex: 'api',
      matchedStatuses: ['passed', 'failed', 'broken', 'skipped'],
    },
    {
      name: 'E2E Tests',
      traceRegex: 'e2e',
      matchedStatuses: ['passed', 'failed', 'broken', 'skipped'],
    },
    { name: 'Product defects', matchedStatuses: ['failed'] },
    { name: 'Test defects', matchedStatuses: ['broken'] },
  ];

  private readonly commonCharts = [
    {
      type: 'currentStatus',
      title: 'Текущий статус',
      statuses: ['passed', 'failed', 'broken', 'skipped'],
      metric: 'passed',
    },
    {
      type: 'testResultSeverities',
      title: 'Статусы по критичности',
      levels: ['blocker', 'critical', 'normal', 'minor', 'trivial'],
      statuses: ['passed', 'failed', 'broken', 'skipped'],
      includeUnset: true,
    },
    {
      type: 'statusDynamics',
      title: 'Динамика статусов',
      limit: 10,
      statuses: ['passed', 'failed', 'broken', 'skipped'],
    },
    { type: 'statusTransitions', title: 'Переходы статусов', limit: 10 },
    {
      type: 'testBaseGrowthDynamics',
      title: 'Динамика роста базы тестов',
      statuses: ['passed', 'failed', 'broken', 'skipped'],
      limit: 10,
    },
    { type: 'coverageDiff', title: 'Карта покрытия' },
    {
      type: 'successRateDistribution',
      title: 'Распределение процента успешности',
    },
    {
      type: 'problemsDistribution',
      title: 'Распределение проблем по окружению',
      by: 'environment',
    },
    {
      type: 'stabilityDistribution',
      title: 'Стабильность по features',
      threshold: 90,
      skipStatuses: ['skipped', 'unknown'],
      groupBy: 'feature',
    },
    {
      type: 'stabilityDistribution',
      title: 'Стабильность по epic',
      threshold: 90,
      skipStatuses: ['skipped', 'unknown'],
      groupBy: 'epic',
    },
    {
      type: 'stabilityDistribution',
      title: 'Стабильность по story',
      threshold: 90,
      skipStatuses: ['skipped', 'unknown'],
      groupBy: 'story',
    },
    {
      type: 'durations',
      title: 'Длительность тестов (гистограмма)',
      groupBy: 'none',
    },
    {
      type: 'durations',
      title: 'Длительность тестов по пирамиде',
      groupBy: 'layer',
    },
    { type: 'durationDynamics', title: 'Динамика длительности', limit: 10 },
    {
      type: 'statusAgePyramid',
      title: 'Пирамида возраста статусов',
      limit: 10,
    },
    {
      type: 'testingPyramid',
      title: 'Пирамида тестирования',
      layers: ['unit', 'integration', 'api', 'e2e'],
    },
  ];

  async generateConfig(
    projectId: string,
    projectName: string,
    logoUrl?: string,
  ): Promise<{ configPath: string; outputPath: string }> {
    const configDir = path.join(
      process.cwd(),
      'data',
      'temp',
      'allure-configs',
    );
    await fs.mkdir(configDir, { recursive: true });

    const configId = uuidv4();
    const configPath = path.join(configDir, `${configId}.mjs`);

    const projectDataDir = path.join(
      process.cwd(),
      'data',
      'projects',
      projectId,
    );
    const outputPath = path.join(projectDataDir, 'reports', 'temp');
    const historyPath = path.join(projectDataDir, 'history', 'history.jsonl');

    await fs.mkdir(path.dirname(historyPath), { recursive: true });

    const defaultLogo = '';

    const configObject = {
      name: projectName,
      output: outputPath,
      historyPath: historyPath,
      historyLimit: 10,
      categories: this.categories,
      plugins: {
        dashboard: {
          import: '@allurereport/plugin-dashboard',
          options: {
            singleFile: true,
            reportName: projectName,
            reportLanguage: 'en',
            logo: logoUrl || defaultLogo,
            theme: 'OS theme',
            layout: this.commonCharts,
          },
        },
        'awesome-by-behavior': {
          import: '@allurereport/plugin-awesome',
          options: {
            reportName: 'Отчеты по features',
            logo: logoUrl || defaultLogo,
            reportLanguage: 'en',
            theme: 'OS theme',
            groupBy: ['epic', 'feature', 'story'],
            charts: this.commonCharts,
          },
        },
        'awesome-by-suite': {
          import: '@allurereport/plugin-awesome',
          options: {
            reportName: 'Отчеты по Suites',
            logo: logoUrl || defaultLogo,
            reportLanguage: 'en',
            theme: 'OS theme',
            groupBy: ['parentSuite', 'suite', 'subSuite'],
            charts: this.commonCharts,
          },
        },
      },
    };

    const configString = JSON.stringify(configObject, null, 2);
    const configContent = `import { defineConfig } from 'allure';\n\nexport default defineConfig(${configString});`;

    await fs.writeFile(configPath, configContent, 'utf-8');
    this.logger.log(
      `Generated config for project ${projectId} (${projectName})`,
    );

    return { configPath, outputPath };
  }

  async cleanupConfig(configPath: string): Promise<void> {
    try {
      await fs.unlink(configPath);
    } catch (error) {
      this.logger.warn(`Failed to cleanup config: ${configPath}`, error);
    }
  }
}
