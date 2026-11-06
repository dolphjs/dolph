import { mkdirSync, writeFileSync } from 'fs';
import { createServer, Server } from 'http';
import request from 'supertest';
import { DolphFactory } from '../core';
import { Component, Get, Render, Route } from '../decorators';
import { useConfig } from './utils/isolated_config';

@Route('pages')
class PageController {
    @Get('home')
    @Render('home')
    home() {
        return { title: 'Dolph' };
    }
}

@Component({ controllers: [PageController], services: [] })
class PageComponent {}

describe.each([
    ['ejs', '<h1><%= title %></h1>'],
    ['pug', 'h1= title'],
    ['handlebars', '<h1>{{title}}</h1>'],
])('Rendering %s views', (engine, template) => {
    let server: Server;
    let restoreConfig: () => void;

    beforeAll(() => {
        restoreConfig = useConfig({ views: { engine, dir: 'views', assets: 'public' } });

        mkdirSync('views');
        mkdirSync('public');
        writeFileSync(`views/home.${engine}`, template);
        writeFileSync('public/asset.txt', 'static content');

        server = createServer(new DolphFactory([PageComponent]).engine()).listen(0);
    });

    afterAll((done) => {
        restoreConfig();
        server.close(done);
    });

    it('should render a template with the handler result', async () => {
        const res = await request(server).get('/v1/pages/home');

        expect(res.status).toBe(200);
        expect(res.headers['content-type']).toMatch(/text\/html/);
        expect(res.text).toContain('<h1>Dolph</h1>');
    });

    it('should serve static assets', async () => {
        const res = await request(server).get('/asset.txt');

        expect(res.status).toBe(200);
        expect(res.text).toBe('static content');
    });
});
