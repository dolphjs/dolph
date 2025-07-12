import { Type } from 'class-transformer';
import { IsNotEmpty, IsNumber, IsOptional, IsString } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @IsNotEmpty()
    name: string;

    @IsNumber()
    age: number;

    @Type(() => String)
    @IsOptional()
    gender: string;

    @IsString()
    email: string;
}
