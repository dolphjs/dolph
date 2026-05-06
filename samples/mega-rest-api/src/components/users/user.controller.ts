import { DolphControllerHandler } from '../../../../../classes';
import { DBody, DParam, DQuery, DRes, Get, Post, Route, Put, Delete, UseMiddleware } from '../../../../../decorators';
import { DResponse, Dolph, SuccessResponse } from '../../../../../common';
import { JwtAuthMiddleware } from '../../../../../common/middlewares';
import { JwtBasicAuth } from '../../../../../classes';
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
    list(@DQuery(ListUsersQueryDto) query: ListUsersQueryDto, @DRes() res: DResponse) {
        const role = query?.role;
        const users = this.UserService.list(role);
        SuccessResponse({ res, body: { users, total: users.length } });
    }

    @Post('/')
    @UseMiddleware(JwtAuthMiddleware(new JwtBasicAuth(APP_SECRET)))
    create(@DBody(CreateUserDto) body: CreateUserDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: this.UserService.create(body) });
    }

    @Get('/:id')
    details(@DParam(UserIdParamDto) params: UserIdParamDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: this.UserService.getById(params.id) });
    }

    @Put('/:id')
    @UseMiddleware(JwtAuthMiddleware(new JwtBasicAuth(APP_SECRET)))
    update(@DParam(UserIdParamDto) params: UserIdParamDto, @DBody(UpdateUserDto) body: UpdateUserDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: this.UserService.update(params.id, body) });
    }

    @Delete('/:id')
    @UseMiddleware(JwtAuthMiddleware(new JwtBasicAuth(APP_SECRET)))
    remove(@DParam(UserIdParamDto) params: UserIdParamDto, @DRes() res: DResponse) {
        SuccessResponse({ res, body: this.UserService.remove(params.id) });
    }
}
