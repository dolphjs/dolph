import { configs } from '../core/config.core';
import { newAuthCookie } from '../utilities';

describe('newAuthCookie flags', () => {
    const originalEnv = configs.NODE_ENV;
    const issue = () => newAuthCookie('user', new Date(Date.now() + 60_000), 'secret');

    afterEach(() => {
        configs.NODE_ENV = originalEnv;
    });

    it.each(['production', 'staging', 'test'])('should be httpOnly, secure and lax in %s', (env) => {
        configs.NODE_ENV = env;

        expect(issue()).toMatchObject({ httpOnly: true, secure: true, sameSite: 'lax' });
    });

    it('should only drop secure in development', () => {
        configs.NODE_ENV = 'development';

        expect(issue()).toMatchObject({ httpOnly: true, secure: false, sameSite: 'lax' });
    });
});
