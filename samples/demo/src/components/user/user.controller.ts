import { DolphControllerHandler } from '../../../../../classes';
import {
    Dolph,
    SuccessResponse,
    DRequest,
    DResponse,
    InternalServerErrorException,
    Middleware,
} from '../../../../../common';
import { Get, Post, Route, UseMiddleware } from '../../../../../decorators';
import { diskStorage, fileUploader, useFileUploader } from '../../../../../packages';
import { UserService } from './user.service';
import { User2Service } from './user2.service';

@Route('user')
export class UserController extends DolphControllerHandler<Dolph> {
    private UserService: UserService;
    private User2Service: User2Service;

    constructor() {
        super();
    }

    @Get('greet')
    async greet(req: DRequest, res: DResponse) {
        const result1 = this.UserService.createUser(12, 'hello');

        const result2 = this.User2Service.get();

        SuccessResponse({
            res,
            body: { message: "you've reached the user endpoint.", resultOne: result1, resultTwo: result2 },
        });
    }

    // Make a wrapper that returns the function : req: DRequest, res: DResponse, next: DNextFunc

    @Post('')
    @UseMiddleware(
        useFileUploader({
            type: 'array',
            fieldname: 'upload',
            maxCount: 2,

            // storage: diskStorage({
            //   destination: './uploads',
            //   filename: (req, file, cb) => {
            //     cb(null, Date.now() + '-' + file.originalname);
            //   },
            // }),
        }),
    )
    async post(req: DRequest, res: DResponse) {
        console.log('req.files: ', req.file);
        SuccessResponse({ res, body: req.body });
    }
}
