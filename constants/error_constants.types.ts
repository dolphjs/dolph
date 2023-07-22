const DolphErrors = {
  serverError: 'internal server error',
  deprc: (value: string) => `${value} is depreciated`,
  notAllowed: (value: string) => `${value} is not allowed`,
  passwordShort: (char: number | string) => `password must be at least ${char} characters`,
  passwordMustContain: (letter: number | string, no: number | string, symbols?: Array<string>) =>
    ` passsword must contain at least ${letter} letter and ${no} number ${
      symbols.length ? `and any of these symbols:${symbols.join(', ')}` : ''
    }`,
};

export { DolphErrors };
