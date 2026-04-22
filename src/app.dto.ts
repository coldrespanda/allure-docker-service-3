import { ApiProperty } from '@nestjs/swagger';

export class HealthResponseDto {
  @ApiProperty()
  status!: string;

  @ApiProperty()
  timestamp!: string;

  @ApiProperty()
  service!: string;
}

export class AllureVersionResponseDto {
  @ApiProperty({ nullable: true })
  version!: string | null;

  @ApiProperty()
  success!: boolean;

  @ApiProperty()
  installed!: boolean;

  @ApiProperty({ required: false })
  error?: string;

  @ApiProperty({ required: false })
  hint?: string;
}

export class RootResponseDto {
  @ApiProperty({ example: 'Allure 3 Report Service API' })
  message!: string;

  @ApiProperty({ example: '3.0.0' })
  version!: string;

  @ApiProperty({
    example: {
      health: '/health',
      projects: '/api/projects',
      docs: '/api/docs',
    },
  })
  endpoints!: Record<string, string>;

  @ApiProperty({ example: 'Web interface available at /' })
  webInterface!: string;
}
