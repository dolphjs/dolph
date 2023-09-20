import { genSalt, hashSync, compareSync } from 'bcryptjs';
import { bcryptCompareParam, bcryptHashParam } from '../../common';

/**
 *
 * @param param0 takes the `salt` and `pureString` params and if the salt param is not given, a 11 round salt is generated by default
 * @returns resulting hash
 *
 * @version 1.0.0
 */
const hashWithBcrypt = async ({ pureString, salt }: bcryptHashParam): Promise<string> => {
  return hashSync(pureString, salt ? salt : await genSalt(11));
};

/**
 *
 * @param param0 takes the `pureString` and `hashString` params
 * @returns {Boolean} true/false depending on the outcome of comparison
 *
 * @version 1.0.0
 */
const compareWithBcryptHash = ({ pureString, hashString }: bcryptCompareParam): boolean => {
  return compareSync(pureString, hashString);
};

export { compareWithBcryptHash, hashWithBcrypt };