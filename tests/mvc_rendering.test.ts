import { mkdtempSync, rmSync, writeFileSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';
import { createServer, Server } from 'http';
import request from 'supertest';
import { DolphFactory, MVCAdapter } from '../core';
import { Component, Get, Render, Route } from '../decorators';

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

// Each case boots its own server, so the view engine set on the shared adapter
// can't leak into another case.
describe.each([
    ['ejs', '<h1><%= title %></h1>'],
    ['pug', 'h1= title'],
])('Rendering %s views', (engine, template) => {
    let server: Server;
    let directory: string;

    beforeAll(() => {
        directory = mkdtempSync(join(tmpdir(), 'dolph-views-'));
        writeFileSync(join(directory, `home.${engine}`), template);
        writeFileSync(join(directory, 'asset.txt'), 'static content');

        MVCAdapter.setViewEngine(engine as 'ejs' | 'pug');
        MVCAdapter.setStaticAssets(directory);
        MVCAdapter.setViewsDir(directory);

        const dolph = new DolphFactory([PageComponent]);
        const app = dolph.engine() as unknown as { set?: (key: string, value: string) => void };

        // Express reads its folder from app settings, not the adapter.
        app.set?.('views', directory);
        server = createServer(app as never).listen(0);
    });

    afterAll((done) => {
        rmSync(directory, { recursive: true, force: true });
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
