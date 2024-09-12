import { Component } from "@dolphjs/dolph/decorators";
import { UserController } from "./user.controller";

@Component({ controllers: [UserController], services: [] })
export class UserComponent {}
