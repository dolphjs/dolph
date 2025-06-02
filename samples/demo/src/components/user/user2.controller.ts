import { DolphControllerHandler } from '../../../../../classes';
import { Dolph, DRequest, DResponse, SuccessResponse } from '../../../../../common';
import { DBody, DReq, DRes, Get, Post, Route } from '../../../../../decorators';
import { CreateUserDto } from './user.dto';
import { User2Service } from './user2.service';

@Route('user2')
export class User2Controller extends DolphControllerHandler<Dolph> {
    private User2Service: User2Service;
    constructor() {
        super();
    }

    @Get('')
    get(req: DRequest, res: DResponse) {
        return req.query;
    }

    @Post('')
    async print(@DReq() req: DRequest, @DRes() res: DResponse, @DBody(CreateUserDto) body: CreateUserDto) {
        SuccessResponse({ res, body });
    }
}
