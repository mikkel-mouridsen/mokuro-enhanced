import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength, MaxLength, Matches } from 'class-validator';

export class CreateUserDto {
  @ApiProperty({
    description: 'Username (3-30 characters, alphanumeric and underscores only)',
    example: 'manga_reader_123',
  })
  @IsString()
  @MinLength(3)
  @MaxLength(30)
  @Matches(/^[a-zA-Z0-9_]+$/, {
    message: 'Username can only contain letters, numbers, and underscores',
  })
  username: string;

  @ApiProperty({
    description: 'Password (minimum 6 characters)',
    example: 'secure_password',
  })
  @IsString()
  @MinLength(6)
  password: string;
}

