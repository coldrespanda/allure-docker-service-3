import { ApiProperty } from '@nestjs/swagger';

class ProjectResultDto {
  @ApiProperty({
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({
    description: 'Временная метка',
    example: '2026-04-22T10:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'Статус',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status!: string;

  @ApiProperty({
    description: 'Путь к сгенерированному отчёту',
    required: false,
  })
  generatedReport?: string;

  @ApiProperty({ description: 'Сообщение об ошибке', required: false })
  error?: string;
}

export class ProjectResponseDto {
  @ApiProperty({ description: 'ID проекта', example: 'my-project' })
  id!: string;

  @ApiProperty({ description: 'Название проекта', example: 'My Project' })
  name!: string;

  @ApiProperty({ description: 'Описание проекта', required: false })
  description?: string;

  @ApiProperty({ description: 'URL логотипа', required: false })
  logoUrl?: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt!: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt!: Date;

  @ApiProperty({ description: 'Список результатов', type: [ProjectResultDto] })
  results!: ProjectResultDto[];
}

export class ProjectListResponseDto {
  @ApiProperty({ description: 'Список проектов', type: [ProjectResponseDto] })
  projects!: ProjectResponseDto[];
}

export class CreateProjectResponseDto {
  @ApiProperty({ description: 'ID проекта', example: 'my-project' })
  id!: string;

  @ApiProperty({ description: 'Название проекта', example: 'My Project' })
  name!: string;

  @ApiProperty({ description: 'Описание проекта', required: false })
  description?: string;

  @ApiProperty({ description: 'URL логотипа', required: false })
  logoUrl?: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt!: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt!: Date;

  @ApiProperty({
    description: 'Список результатов (всегда пустой при создании)',
    example: [],
    type: 'array',
    items: { type: 'object' },
  })
  results!: [];
}

export class DeleteProjectResponseDto {
  @ApiProperty({
    description: 'Сообщение об успешном удалении',
    example: 'Project deleted successfully',
  })
  message!: string;
}
