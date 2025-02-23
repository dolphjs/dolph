import {} from '../decorators';
import { DRequest, DResponse, DNextFunc, validateBodyMiddleware } from '../common';
import { IsString, Length } from 'class-validator';

class TestDto {
    @IsString()
    @Length(1, 10)
    name: string;
}

describe('Validation Middleware', () => {
    let req: Partial<DRequest>;
    let res: Partial<DResponse>;
    let next: DNextFunc;

    beforeEach(() => {
        req = { body: { name: 'test' } };

        res = {
            status: jest.fn().mockReturnThis(),
            json: jest.fn(),
        };

        next = jest.fn();
    });

    it('should call next if validation succeeds', async () => {
        req.body = { name: 'validName' };
        const middleware = validateBodyMiddleware(TestDto);
        await middleware(req as DRequest, res as DResponse, next);
        expect(next).toHaveBeenCalled();
        expect(res.status).not.toHaveBeenCalled();
        expect(res.json).not.toHaveBeenCalled();
    });

    it('should return 400 if validation fails', async () => {
        req.body = { name: '' };
        const middleware = validateBodyMiddleware(TestDto);
        await middleware(req as DRequest, res as DResponse, next);
        expect(res.status).toHaveBeenCalledWith(400);
        expect(res.json).toHaveBeenCalledWith(
            expect.objectContaining({ message: 'Validation failed', error: expect.any(String) }),
        );
        expect(next).not.toHaveBeenCalled();
    });
});
