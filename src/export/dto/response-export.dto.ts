import { ApiProperty } from '@nestjs/swagger';

class FileInfoDto {
  @ApiProperty({ description: 'Имя файла или папки', example: 'index.html' })
  name!: string;

  @ApiProperty({ description: 'Тип (file или directory)', example: 'file' })
  type!: string;

  @ApiProperty({
    description: 'Размер в байтах (для файлов)',
    required: false,
    example: 1024,
  })
  size?: number;

  @ApiProperty({ description: 'Дата последнего изменения', required: false })
  modified?: Date;

  @ApiProperty({
    description: 'Дочерние элементы (для директорий)',
    type: [FileInfoDto],
    required: false,
  })
  children?: FileInfoDto[];
}

export class ReportInfoResponseDto {
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
    description: 'Статус отчёта',
    enum: ['pending', 'processing', 'completed', 'failed'],
    example: 'completed',
  })
  status!: string;

  @ApiProperty({
    description: 'Общий размер отчёта в байтах',
    example: 9377131,
  })
  size!: number;

  @ApiProperty({ description: 'Структура файлов отчёта', type: [FileInfoDto] })
  files!: FileInfoDto[];
}
