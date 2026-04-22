import { ApiProperty } from '@nestjs/swagger';

export class ResultResponseDto {
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

export class UploadResultsResponseDto {
  @ApiProperty({
    description: 'Информация о загруженном результате',
    type: ResultResponseDto,
  })
  result!: ResultResponseDto;

  @ApiProperty({
    description: 'Количество извлечённых файлов (для ZIP)',
    required: false,
    example: 1221,
  })
  filesExtracted?: number;

  @ApiProperty({
    description: 'Сообщение о статусе',
    example: 'Report generation started automatically',
  })
  message!: string;
}

export class SendResultsResponseDto {
  @ApiProperty({
    description: 'Информация о загруженном результате',
    type: ResultResponseDto,
  })
  result!: ResultResponseDto;

  @ApiProperty({
    description: 'Сообщение о статусе',
    example: 'Results uploaded, report generation started automatically',
  })
  message!: string;
}

export class ReportListItemDto {
  @ApiProperty({
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  resultId!: string;

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
    description: 'URL для доступа к отчёту',
    example: '/reports/my-project/123e4567/',
  })
  reportUrl!: string;
}

export class ReportsListResponseDto {
  @ApiProperty({ description: 'Список отчётов', type: [ReportListItemDto] })
  reports!: ReportListItemDto[];
}

export class LatestReportResponseDto {
  @ApiProperty({
    description: 'UUID результата',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  resultId!: string;

  @ApiProperty({
    description: 'Временная метка',
    example: '2026-04-22T10:00:00.000Z',
  })
  timestamp!: string;

  @ApiProperty({
    description: 'URL для доступа к отчёту',
    example: '/reports/my-project/123e4567/',
  })
  reportUrl!: string;
}

export class DeleteReportResponseDto {
  @ApiProperty({
    description: 'Сообщение об успешном удалении',
    example: 'Report deleted successfully',
  })
  message!: string;
}
