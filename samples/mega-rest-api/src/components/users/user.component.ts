import { Component } from '../../../../../decorators';
import { UserController } from './user.controller';
import { UserService } from './user.service';

@Component({ controllers: [UserController], services: [UserService] })
export class UserComponent {}
