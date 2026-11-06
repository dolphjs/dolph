import * as utilities from '../utilities';
import { generateVerificationCode } from '../utilities';

describe('generateVerificationCode', () => {
    it('should return six digits by default', () => {
        expect(generateVerificationCode()).toMatch(/^\d{6}$/);
    });

    it.each([1, 5, 7, 12])('should return %i digits when asked', (digits) => {
        expect(generateVerificationCode(digits)).toMatch(new RegExp(`^\\d{${digits}}$`));
    });

    it('should return a different code across calls', () => {
        const codes = new Set(Array.from({ length: 50 }, () => generateVerificationCode(12)));

        expect(codes.size).toBe(50);
    });

    it('should use every digit', () => {
        const seen = new Set(generateVerificationCode(500));

        expect(seen.size).toBe(10);
    });

    it.each([0, -1, 2.5, Number.NaN])('should reject %p as a length', (digits) => {
        expect(() => generateVerificationCode(digits)).toThrow('positive whole number');
    });

    it('should no longer export the fixed codes', () => {
        expect(utilities).not.toHaveProperty('uniqueSixDigitsCode');
    });
});
