import { randomInt } from 'crypto';

/**
 * Generates a random numeric code, such as for email verification.
 *
 * Returns a new code on every call, from a cryptographically secure source.
 *
 * @param digits how long the code should be, defaults to 6
 *
 * @version 2.0.0
 */
const generateVerificationCode = (digits = 6): string => {
    if (!Number.isInteger(digits) || digits < 1) {
        throw new Error('`digits` must be a positive whole number');
    }

    return Array.from({ length: digits }, () => randomInt(10)).join('');
};

export { generateVerificationCode };
