import { genSalt, hashSync, compareSync } from 'bcryptjs';
import { bcryptCompareParam, bcryptHashParam } from '../../common';
import { boolean } from 'joi';

/**
 *
 * @param param0 takes the `salt` and `pureString` params and if the salt param is not given, a 11 round salt is generated by default
 * @returns resulting hash
 *
 * @version 1.0.0
 * @deprecated use `hashString` instead
 */
const hashWithBcrypt = async ({ pureString, salt }: bcryptHashParam): Promise<string> => {
    return hashSync(pureString, salt ? salt : await genSalt(11));
};

/**
 *
 * @param pureString this is the string to be hashed
 * @param salt this is the salt. In the absence of the field, an 11 round salt is generated by default
 * @returns resulting hash
 *
 * @version 2.0
 */
const hashString = async (pureString: string, salt: number = 11): Promise<string> => {
    return hashSync(pureString, await genSalt(salt));
};

/**
 *
 * @param param0 takes the `pureString` and `hashString` params
 * @returns {Boolean} true/false depending on the outcome of comparison
 *
 * @version 1.0.0
 * @deprecated use `compareHashedString` instead
 *
 */
const compareWithBcryptHash = ({ pureString, hashString }: bcryptCompareParam): boolean => {
    return compareSync(pureString, hashString);
};

/**
 *
 * @param pureString this is the string to br compared against
 * @param hashString  this is the previously hashed string
 * @returns {Boolean}
 *
 * @version 2.0
 */
const compareHashedString = (pureString: string, hashString: string): boolean => {
    return compareSync(pureString, hashString);
};

export { compareWithBcryptHash, hashWithBcrypt, compareHashedString, hashString };
