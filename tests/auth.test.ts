import { generateJWTwithHMAC, verifyJWTwithHMAC, generateJWTwithRSA, verifyJWTwithRSA } from '../utilities/auth/JWT_generator.utilities';
import { newAuthCookie, cookieAuthVerify } from '../utilities/auth/cookie.utilities';
import { IPayload, ErrorException, HttpStatus } from '../common';
import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';

describe('Auth Utilities', () => {
    describe('JWT Generator', () => {
        const secret = 'test-secret';
        const payload: IPayload = { sub: '12345', exp: Math.floor(Date.now() / 1000) + 3600, iat: Math.floor(Date.now() / 1000) };
        
        let privateKeyPath: string;
        let publicKeyPath: string;
        
        beforeAll(() => {
            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: { type: 'spki', format: 'pem' },
                privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
            });
            privateKeyPath = path.join(__dirname, 'private.pem');
            publicKeyPath = path.join(__dirname, 'public.pem');
            fs.writeFileSync(privateKeyPath, privateKey);
            fs.writeFileSync(publicKeyPath, publicKey);
        });

        afterAll(() => {
            if (fs.existsSync(privateKeyPath)) fs.unlinkSync(privateKeyPath);
            if (fs.existsSync(publicKeyPath)) fs.unlinkSync(publicKeyPath);
        });

        it('should generate and verify JWT with HMAC', () => {
            const token = generateJWTwithHMAC({ payload, secret });
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            const decoded = verifyJWTwithHMAC({ token, secret });
            expect((decoded as any).sub).toBe('12345');
        });

        it('should generate and verify JWT with RSA', () => {
            const token = generateJWTwithRSA({ pathToPrivateKey: privateKeyPath, payload });
            expect(token).toBeDefined();
            expect(typeof token).toBe('string');
            
            const decoded = verifyJWTwithRSA({ token, pathToPublicKey: publicKeyPath });
            expect((decoded as any).sub).toBe('12345');
        });

        it('should throw error when verifying invalid RSA token', () => {
            expect(() => {
                verifyJWTwithRSA({ token: 'invalid.token.here', pathToPublicKey: publicKeyPath });
            }).toThrow();
        });
    });

    describe('Cookie Utilities', () => {
        const secret = 'test-secret';
        
        it('should create new auth cookie', () => {
            const date = new Date();
            const cookie = newAuthCookie('user-id', date, secret, 'extra-info');
            
            expect(cookie.name).toBe('xAuthToken');
            expect(cookie.value).toBeDefined();
            expect(cookie.expires).toEqual(date);
        });
        
        it('should verify cookie auth and inject payload', () => {
            const date = new Date(Date.now() + 10000);
            const cookie = newAuthCookie('user-id', date, secret);
            
            const req: any = {
                cookies: {
                    xAuthToken: cookie.value
                }
            };
            const res: any = {};
            const next = jest.fn();
            
            cookieAuthVerify(secret)(req, res, next);
            expect(next).toHaveBeenCalledWith();
            expect(req.payload).toBeDefined();
            expect(req.payload.sub).toBe('user-id');
        });

        it('should fail if no cookies exist', () => {
            const req: any = {};
            const res: any = {};
            const next = jest.fn();
            
            cookieAuthVerify(secret)(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(ErrorException));
            expect(next.mock.calls[0][0].statusCode).toBe(HttpStatus.UNAUTHORIZED);
        });

        it('should fail if xAuthToken does not exist', () => {
            const req: any = { cookies: { otherCookie: 'value' } };
            const res: any = {};
            const next = jest.fn();
            
            cookieAuthVerify(secret)(req, res, next);
            expect(next).toHaveBeenCalledWith(expect.any(ErrorException));
            expect(next.mock.calls[0][0].statusCode).toBe(HttpStatus.UNAUTHORIZED);
        });
    });
});
