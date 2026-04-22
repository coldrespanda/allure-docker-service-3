import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';
import { json, urlencoded } from 'express';
import { join } from 'path';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { UPLOAD_LIMITS } from './common/upload.constants';

async function bootstrap() {
  const logger = new Logger('Bootstrap');

  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.use(json({ limit: UPLOAD_LIMITS.JSON.MAX_SIZE }));
  app.use(urlencoded({ extended: true, limit: UPLOAD_LIMITS.JSON.MAX_SIZE }));

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );

  app.enableCors();

  app.useStaticAssets(join(__dirname, '..', 'public'), {
    index: 'index.html',
  });

  const config = new DocumentBuilder()
    .setTitle('Allure Docker Service API')
    .setDescription('API для управления проектами и генерации Allure отчетов')
    .setVersion('3.0.0')
    .addTag('projects', 'Управление проектами и результатами')
    .addTag('generation', 'Генерация отчетов')
    .addTag('export', 'Экспорт отчетов')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT ?? 3000;
  await app.listen(port);

  logger.log(`Application is running on: http://localhost:${port}`);
  logger.log(`Web interface: http://localhost:${port}`);
  logger.log(`Health check: http://localhost:${port}/health`);
  logger.log(`Allure version: http://localhost:${port}/allure-version`);
  logger.log(`Swagger UI: http://localhost:${port}/api/docs`);
}

void bootstrap().catch((error) => {
  const errorMessage = error instanceof Error ? error.message : String(error);
  console.error(`Failed to start application: ${errorMessage}`);
  process.exit(1);
});
