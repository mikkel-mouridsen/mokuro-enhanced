import { ApiProperty } from '@nestjs/swagger';
import { IsString } from 'class-validator';

export class LoginDto {
  @ApiProperty({
    description: 'Username',
    example: 'manga_reader_123',
  })
  @IsString()
  username: string;

  @ApiProperty({
    description: 'Password',
    example: 'secure_password',
  })
  @IsString()
  password: string;
}

