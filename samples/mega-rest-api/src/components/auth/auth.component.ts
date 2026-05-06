import { Component } from '../../../../../decorators';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';

@Component({ controllers: [AuthController], services: [AuthService] })
export class AuthComponent {}
