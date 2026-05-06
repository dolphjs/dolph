import { DolphControllerHandler } from '../../../../classes';
import { DRequest, DResponse, Dolph, SuccessResponse } from '../../../../common';

export class PublicController extends DolphControllerHandler<Dolph> {
    docs(req: DRequest, res: DResponse) {
        SuccessResponse({
            res,
            body: {
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
            },
        });
    }

    echo(req: DRequest, res: DResponse) {
        SuccessResponse({ res, body: { body: req.body, query: req.query, params: req.params } });
    }
}
