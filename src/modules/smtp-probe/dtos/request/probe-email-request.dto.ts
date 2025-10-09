import { IsEmail, IsOptional, IsNumber, IsString } from 'class-validator';

/**
 * Request DTO for email probing
 */
export class ProbeEmailRequestDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  clientId?: string;
}

