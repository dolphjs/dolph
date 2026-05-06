import { IsNumber, IsOptional, IsString, MaxLength, Min, MinLength } from 'class-validator';

export class CreateUserDto {
    @IsString()
    @MinLength(3)
    username!: string;

    @IsString()
    @MinLength(2)
    role!: string;

    @IsNumber()
    @Min(1)
    age!: number;
}

export class UpdateUserDto {
    @IsOptional()
    @IsString()
    @MaxLength(40)
    role?: string;

    @IsOptional()
    @IsNumber()
    @Min(1)
    age?: number;
}

export class UserIdParamDto {
    @IsString()
    id!: string;
}

export class ListUsersQueryDto {
    @IsOptional()
    @IsString()
    role?: string;
}
