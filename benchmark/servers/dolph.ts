import 'reflect-metadata';
import { DolphFactory } from '../../core';
import { DolphControllerHandler } from '../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../common';
import { Component, Get, Post, Route } from '../../decorators';

@Route('')
class BenchController extends DolphControllerHandler<Dolph> {
    constructor() {
        super();
    }

    @Get('ping')
    ping(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { message: 'pong' } });
    }

    @Get('users/:id')
    getUser(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { id: req.params.id, name: 'John Doe' } });
    }

    @Post('echo')
    echo(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: req.body });
    }
}

@Component({ controllers: [BenchController], services: [] })
class BenchComponent {}

const app = new DolphFactory([BenchComponent]);
app.start();
