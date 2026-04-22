import { ApiProperty } from '@nestjs/swagger';

export class TaskResponseDto {
  @ApiProperty({
    description: 'UUID задачи',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  id!: string;

  @ApiProperty({ description: 'UUID проекта', example: 'my-project' })
  projectId!: string;

  @ApiProperty({
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  resultId!: string;

  @ApiProperty({
    description: 'Статус задачи',
    enum: ['pending', 'processing', 'completed', 'failed'],
  })
  status!: string;

  @ApiProperty({
    description: 'Путь к сгенерированному отчёту',
    required: false,
  })
  outputPath?: string;

  @ApiProperty({ description: 'Сообщение об ошибке', required: false })
  error?: string;

  @ApiProperty({ description: 'Дата создания' })
  createdAt!: Date;

  @ApiProperty({ description: 'Дата обновления' })
  updatedAt!: Date;
}

export class GenerateReportResponseDto {
  @ApiProperty({
    description: 'UUID задачи',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  taskId!: string;

  @ApiProperty({ description: 'Статус задачи', example: 'pending' })
  status!: string;

  @ApiProperty({
    description: 'Сообщение о статусе',
    example: 'Report generation started',
  })
  message!: string;

  @ApiProperty({ description: 'Детали задачи', type: TaskResponseDto })
  task!: TaskResponseDto;
}

export class TaskListResponseDto {
  @ApiProperty({ description: 'Список задач', type: [TaskResponseDto] })
  tasks!: TaskResponseDto[];
}
