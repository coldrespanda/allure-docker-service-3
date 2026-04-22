import { IsString, IsArray, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
import { ApiProperty } from '@nestjs/swagger';

export class ResultFileDto {
  @ApiProperty({
    description: 'Имя файла',
    example: 'result.json',
  })
  @IsString()
  file_name!: string;

  @ApiProperty({
    description: 'Содержимое файла в base64',
    example: 'eyJzdGF0dXMiOiJwYXNzZWQifQ==',
  })
  @IsString()
  content_base64!: string;
}

export class SendResultsDto {
  @ApiProperty({
    description: 'Массив файлов результатов',
    type: [ResultFileDto],
  })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ResultFileDto)
  results!: ResultFileDto[];
}
