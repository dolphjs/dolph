type bcryptHashParam = { salt: number; pureString: string };
type bcryptCompareParam = { pureString: string; hashString: string };
type argonHashParam = {
  pureString: string;
  timeCost?: number;
  memoryCost?: number;
  parallelism?: number;
  type?: 0 | 1 | 2;
  version?: number;
  salt?: Buffer;
  saltLength?: number;
  raw?: true;
  secret?: Buffer;
};

export { bcryptHashParam, bcryptCompareParam, argonHashParam };
