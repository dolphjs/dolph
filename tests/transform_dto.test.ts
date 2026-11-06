import { IsEmail, IsString } from 'class-validator';
import { transformAndValidateDto } from '../core/transformer';
import { logger } from '../utilities';

class SignupDto {
    @IsString()
    name: string;

    @IsEmail()
    email: string;
}

describe('transformAndValidateDto', () => {
    let errorLog: jest.SpyInstance;

    beforeEach(() => {
        errorLog = jest.spyOn(logger, 'error').mockImplementation(() => logger);
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    it('should return a DTO instance for valid input', async () => {
        const dto = await transformAndValidateDto(SignupDto, { name: 'dolph', email: 'a@b.co' }, 'request body');

        expect(dto).toBeInstanceOf(SignupDto);
        expect(dto.email).toBe('a@b.co');
    });

    it('should reject invalid input without writing a log line', async () => {
        await expect(
            transformAndValidateDto(SignupDto, { name: 'dolph', email: 'nope' }, 'request body'),
        ).rejects.toMatchObject({
            statusCode: 400,
            errors: [expect.objectContaining({ property: 'email' })],
        });

        expect(errorLog).not.toHaveBeenCalled();
    });

    it('should reject fields that are not on the DTO by default', async () => {
        await expect(
            transformAndValidateDto(SignupDto, { name: 'dolph', email: 'a@b.co', admin: true }, 'request body'),
        ).rejects.toMatchObject({ statusCode: 400 });
    });

    it('should return the source unchanged when no DTO is given', async () => {
        const source = { anything: true };

        await expect(transformAndValidateDto(undefined, source, 'request body')).resolves.toBe(source);
    });

    it.each([String, Number, Boolean, Object])('should reject %p as a DTO type and name it in the log', async (type) => {
        await expect(transformAndValidateDto(type as never, {}, 'request body')).rejects.toThrow(
            'Misconfigured DTO type',
        );

        expect(errorLog).toHaveBeenCalledWith(expect.stringContaining(type.name));
    });
});
