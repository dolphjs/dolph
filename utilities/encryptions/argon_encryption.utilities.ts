import { hash, verify } from 'argon2';
import { argonHahsParam, bcryptCompareParam } from '../../common';

/**
 *
 * Creates a string hash using the `argon2` library
 *  - see [https://argon2.dev]
 */
const hashWithArgon = async ({
  pureString,
  salt,
  memoryCost,
  secret,
  version,
  parallelism,
  raw,
  type,
  timeCost,
}: argonHahsParam) => {
  return hash(pureString, { salt, memoryCost, secret, version, parallelism, raw, type, timeCost });
};

/**
 *
 * Compare's string hash created by the argon2 library against a normal string
 *
 */
const verifyArgonHash = async ({ pureString, hashString }: bcryptCompareParam) => {
  return verify(hashString, pureString);
};

export { hashWithArgon, verifyArgonHash };
