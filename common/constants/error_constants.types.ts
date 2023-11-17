const DolphErrors = {
  serverError: 'internal server error',
  deprc: (value: string) => `${value} is depreciated`,
  notAllowed: (value: string) => `${value} is not allowed`,
  serverClosed: 'dolphjs server closed',
  sigtermReceived: 'SIGTREM received',
  passwordShort: (char: number | string) => `password must be at least ${char} characters`,
  passwordMustContain: (letter: number | string, no: number | string, symbols?: Array<string>) =>
    ` passsword must contain at least ${letter} letter and ${no} number ${
      symbols.length ? `and any of these symbols:${symbols.join(', ')}` : ''
    }`,
  noDolphConfigFile:
    'dolphjs engine cannot start without dolphjs_config.yaml file, please ensure to add it to root directory',
};

export { DolphErrors };
