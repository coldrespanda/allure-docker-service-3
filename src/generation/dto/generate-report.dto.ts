import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class GenerateReportDto {
  @ApiProperty({
    description: 'UUID результата для генерации отчёта',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @IsString()
  resultId!: string;
}
