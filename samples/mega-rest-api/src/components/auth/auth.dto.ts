import { IsIn, IsString, MinLength } from 'class-validator';

export class LoginDto {
    @IsString()
    @MinLength(3)
    username!: string;

    @IsString()
    @MinLength(4)
    password!: string;
}

export class RefreshDto {
    @IsString()
    refreshToken!: string;
}

export class RoleDto {
    @IsIn(['admin', 'user', 'auditor'])
    role!: 'admin' | 'user' | 'auditor';
}
