import { objectId } from '../utilities/validators/objectId_validator.validator';
import { validatePassword } from '../utilities/validators/password_validator.validator';
import { DolphErrors } from '../common/constants';

describe('Validator Utilities', () => {
    describe('objectId_validator', () => {
        const helpers = { message: jest.fn(msg => msg) };

        beforeEach(() => {
            helpers.message.mockClear();
        });

        it('should return value for valid object id', () => {
            const validId = '507f1f77bcf86cd799439011';
            const result = objectId(validId, helpers);
            expect(result).toBe(validId);
            expect(helpers.message).not.toHaveBeenCalled();
        });

        it('should return error message for invalid object id', () => {
            const invalidId = 'invalid-id';
            const result = objectId(invalidId, helpers);
            expect(result).toBe('"{{#label}}" must be a valid mongo id');
            expect(helpers.message).toHaveBeenCalled();
        });
    });

    describe('password_validator', () => {
        const helpers = { message: jest.fn(msg => msg) };

        beforeEach(() => {
            helpers.message.mockClear();
        });

        describe('basic strength', () => {
            it('should pass for password length >= 6', () => {
                const result = validatePassword('basic', '123456', helpers);
                expect(result).toBeUndefined();
            });

            it('should fail for password length < 6', () => {
                const result = validatePassword('basic', '12345', helpers);
                expect(result).toBe(DolphErrors.passwordShort(6));
            });
        });

        describe('medium strength', () => {
            it('should pass for password length >= 6 and contains letters', () => {
                const result = validatePassword('medium', 'abc123456', helpers);
                expect(result).toBeUndefined();
            });

            it('should fail for password length < 6', () => {
                const result = validatePassword('medium', '12345', helpers);
                expect(result).toBe(DolphErrors.passwordShort(6));
            });

            it('should fail for password without letters', () => {
                const result = validatePassword('medium', '12345678', helpers);
                expect(result).toBe(DolphErrors.passwordMustContain(1, 1));
            });
        });

        describe('strong strength', () => {
            it('should pass for password length >= 7 and contains letters', () => {
                const result = validatePassword('strong', 'abc123456', helpers);
                expect(result).toBeUndefined();
            });

            it('should fail for password length < 7', () => {
                const result = validatePassword('strong', 'abc123', helpers);
                expect(result).toBe(DolphErrors.passwordShort(7));
            });

            it('should fail for password without letters', () => {
                const result = validatePassword('strong', '12345678', helpers);
                expect(result).toBe(DolphErrors.passwordMustContain(1, 1));
            });
        });
    });
});
