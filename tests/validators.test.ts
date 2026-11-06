import { objectId } from '../utilities/validators/objectId_validator.validator';
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
});
