import { hash, verify } from 'argon2';
import { argonHahsParam, bcryptCompareParam } from '../..';
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

const verifyArgonHash = async ({ pureString, hashString }: bcryptCompareParam) => {
  return verify(hashString, pureString);
};

export { hashWithArgon, verifyArgonHash };
