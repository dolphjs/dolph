import { DolphControllerHandler, jwtAuth } from '../../../../../classes';
import { DBody, DParam, DQuery, DRes, Get, Post, Route, Put, Delete, UseMiddleware } from '../../../../../decorators';
import { DResponse, Dolph } from '../../../../../common';
import { APP_SECRET } from '../../constants';
import { CreateUserDto, ListUsersQueryDto, UpdateUserDto, UserIdParamDto } from './user.dto';
import { UserService } from './user.service';

@Route('/users')
export class UserController extends DolphControllerHandler<Dolph> {
    private UserService: UserService;

    constructor() {
        super();
    }

    @Get('/')
    list(@DQuery(ListUsersQueryDto) query: ListUsersQueryDto) {
        const role = query?.role;
        const users = this.UserService.list(role);
        return { users, total: users.length };
    }

    @Post('/')
    @UseMiddleware(jwtAuth(APP_SECRET))
    create(@DBody(CreateUserDto) body: CreateUserDto) {
        return this.UserService.create(body);
    }

    @Get('/:id')
    details(@DParam(UserIdParamDto) params: UserIdParamDto) {
        return this.UserService.getById(params.id);
    }

    @Put('/:id')
    @UseMiddleware(jwtAuth(APP_SECRET))
    update(@DParam(UserIdParamDto) params: UserIdParamDto, @DBody(UpdateUserDto) body: UpdateUserDto) {
        return this.UserService.update(params.id, body);
    }

    @Delete('/:id')
    @UseMiddleware(jwtAuth(APP_SECRET))
    remove(@DParam(UserIdParamDto) params: UserIdParamDto) {
        return this.UserService.remove(params.id);
    }
}
