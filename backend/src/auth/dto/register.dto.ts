import { ApiProperty } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsEmail, IsString, Matches, MaxLength, MinLength } from 'class-validator';

export class RegisterDto {
  @ApiProperty({ example: 'player@example.com' })
  // Normalize before validation/persistence so Person@Example.com and
  // person@example.com can never become two accounts.
  @Transform(({ value }) => (typeof value === 'string' ? value.trim().toLowerCase() : value))
  @IsEmail()
  @MaxLength(254)
  email!: string;

  @ApiProperty({ example: 'player_one', description: '3-20 chars: letters, numbers, underscore' })
  @IsString()
  @Matches(/^[a-zA-Z0-9_]{3,20}$/, {
    message: 'username must be 3-20 characters using only letters, numbers, or underscores',
  })
  username!: string;

  @ApiProperty({ example: 'S3cure-password', minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(72) // bcrypt input limit
  password!: string;
}
