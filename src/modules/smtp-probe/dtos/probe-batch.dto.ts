import { IsArray, IsEmail, IsNotEmpty, ArrayMinSize, ArrayMaxSize } from 'class-validator';

export class ProbeBatchDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(1000) // Reasonable limit for batch processing
  @IsEmail({}, { each: true })
  @IsNotEmpty()
  emails: string[];
}
