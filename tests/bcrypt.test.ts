import { hashWithBcrypt, hashString, compareWithBcryptHash, compareHashedString, compareHashedStringAsync } from '../utilities/encryptions/bcrypt_encryption.utilities';

describe('Bcrypt Encryption Utilities', () => {
    const rawPassword = 'mySuperSecretPassword123!';

    describe('hashWithBcrypt (deprecated)', () => {
        it('should hash string with default generated salt', async () => {
            const hash = await hashWithBcrypt({ pureString: rawPassword, salt: 11 });
            expect(hash).toBeDefined();
            expect(hash).not.toBe(rawPassword);
            expect(typeof hash).toBe('string');
        });

        it('should hash string with provided salt string', async () => {
            const hash = await hashWithBcrypt({ pureString: rawPassword, salt: 12 });
            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
        });
    });

    describe('hashString', () => {
        it('should hash string with default 11 round salt', async () => {
            const hash = await hashString(rawPassword);
            expect(hash).toBeDefined();
            expect(hash).not.toBe(rawPassword);
            expect(typeof hash).toBe('string');
        });

        it('should hash string with custom salt rounds', async () => {
            const hash = await hashString(rawPassword, 12);
            expect(hash).toBeDefined();
            expect(typeof hash).toBe('string');
        });
    });

    describe('compareWithBcryptHash (deprecated)', () => {
        it('should return true for matching passwords', async () => {
            const hash = await hashString(rawPassword);
            const result = compareWithBcryptHash({ pureString: rawPassword, hashString: hash });
            expect(result).toBe(true);
        });

        it('should return false for non-matching passwords', async () => {
            const hash = await hashString(rawPassword);
            const result = compareWithBcryptHash({ pureString: 'wrongPassword', hashString: hash });
            expect(result).toBe(false);
        });
    });

    describe('compareHashedString', () => {
        it('should return true for matching passwords', async () => {
            const hash = await hashString(rawPassword);
            const result = compareHashedString(rawPassword, hash);
            expect(result).toBe(true);
        });

        it('should return false for non-matching passwords', async () => {
            const hash = await hashString(rawPassword);
            const result = compareHashedString('wrongPassword', hash);
            expect(result).toBe(false);
        });
    });
});

describe('Non-blocking password checks', () => {
    it('should resolve true for the right password', async () => {
        const hashed = await hashString('correct horse', 4);

        await expect(compareHashedStringAsync('correct horse', hashed)).resolves.toBe(true);
    });

    it('should resolve false for the wrong password', async () => {
        const hashed = await hashString('correct horse', 4);

        await expect(compareHashedStringAsync('wrong', hashed)).resolves.toBe(false);
    });

    it('should keep compareHashedString returning a real boolean', async () => {
        const hashed = await hashString('correct horse', 4);

        expect(compareHashedString('wrong', hashed)).toBe(false);
    });

    it('should not block the event loop while hashing', async () => {
        let ticks = 0;
        const timer = setInterval(() => (ticks += 1), 1);

        await hashString('correct horse', 10);
        clearInterval(timer);

        expect(ticks).toBeGreaterThan(0);
    });
});
