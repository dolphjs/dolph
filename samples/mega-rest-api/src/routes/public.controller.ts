import { DolphControllerHandler } from '../../../../classes';
import { DRequest, DResponse, Dolph } from '../../../../common';

// Mounted on an Express router, so these send their own responses. Returned values only
// work on @Route controllers.
export class PublicController extends DolphControllerHandler<Dolph> {
    docs(req: DRequest, res: DResponse) {
        res.json({
            name: 'Mega REST API Sample',
            endpoints: {
                health: '/api/v1/health',
                auth: '/api/v1/auth',
                users: '/api/v1/users',
                files: '/api/v1/files',
                admin: '/api/v1/admin',
                public: '/api/v1/public',
            },
            query: req.query,
        });
    }

    echo(req: DRequest, res: DResponse) {
        res.json({ body: req.body, query: req.query, params: req.params });
    }
}
