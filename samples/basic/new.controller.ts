import { DolphControllerHandler } from '../../classes';
import { DRequest, Dolph } from '../../common';
import { DBody, DReq, Get, Post, Render, Route, Shield, UnShield } from '../../decorators';
import { testMiddleware } from './app.middleware';
import { CreateUserDto } from './new.dto';
import { NewService } from './new.service';

@Shield(testMiddleware)
@Route('app')
export class NewController extends DolphControllerHandler<Dolph> {
    private NewService: NewService;

    constructor() {
        super();
    }

    @Get('test')
    async newReq(req: DRequest) {
        this.NewService.logger();
        const a = this.NewService.newA();
        return { message: a };
    }

    @Post('test')
    @UnShield(testMiddleware)
    async testNewController(@DBody(CreateUserDto) dto: CreateUserDto, @DReq() req: DRequest) {
        return { dto, ...req.payload };
    }

    @Get('home')
    @Render('home')
    getHomePage(req: DRequest) {
        return { title: 'Home' };
    }

    @Get('about')
    @Render('about')
    getAboutPage(req: DRequest) {
        return { title: 'About' };
    }
}
