import { IsEmail, IsNotEmpty } from 'class-validator';

export class ProbeEmailDto {
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
