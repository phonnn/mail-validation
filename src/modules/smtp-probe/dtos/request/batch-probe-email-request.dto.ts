import { IsArray, IsEmail, IsOptional, IsString, IsNumber, ArrayMinSize, ArrayMaxSize, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class SingleEmailProbeDto {
  @IsEmail()
  email: string;

  @IsOptional()
  @IsString()
  clientId?: string;
}

export class BatchProbeEmailRequestDto {
  @IsArray()
  @ArrayMinSize(1, { message: 'At least one email is required' })
  @ArrayMaxSize(100, { message: 'Maximum 100 emails allowed per batch' })
  @ValidateNested({ each: true })
  @Type(() => SingleEmailProbeDto)
  emails: SingleEmailProbeDto[];

  @IsOptional()
  @IsNumber()
  priority?: number;

  @IsOptional()
  @IsString()
  batchId?: string;
}
