import { Component } from '../../../../../decorators';
import { AdminController } from './admin.controller';
import { AdminService } from './admin.service';

@Component({ controllers: [AdminController], services: [AdminService] })
export class AdminComponent {}
