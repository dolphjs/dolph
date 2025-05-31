import { Component } from '../../../../../decorators';
import { UserController } from './user.controller';
import { UserService } from './user.service';
import { User2Controller } from './user2.controller';
import { User2Service } from './user2.service';

@Component({ controllers: [UserController, User2Controller], services: [UserService, User2Service] })
export class UserComponent {}
