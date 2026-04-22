import { ApiProperty } from '@nestjs/swagger';
import {
  IsString,
  IsOptional,
  IsUrl,
  Matches,
  MaxLength,
} from 'class-validator';

export class CreateProjectDto {
  @ApiProperty({
    description: 'ID проекта (латиница, цифры, дефис)',
    example: 'my-project',
    pattern: '^[a-z0-9-]+$',
    maxLength: 100,
  })
  @IsString()
  @Matches(/^[a-z0-9-]+$/, {
    message:
      'Project ID can only contain lowercase letters, numbers, and hyphens',
  })
  @MaxLength(100)
  id!: string;

  @ApiProperty({
    description: 'Название проекта',
    example: 'My Project',
    required: false,
  })
  @IsString()
  @IsOptional()
  name?: string;

  @ApiProperty({
    description: 'Описание проекта',
    example: 'Test project description',
    required: false,
  })
  @IsString()
  @IsOptional()
  description?: string;

  @ApiProperty({
    description: 'URL логотипа',
    example: 'https://example.com/logo.png',
    required: false,
  })
  @IsUrl()
  @IsOptional()
  logoUrl?: string;
}
