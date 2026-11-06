const DolphErrors = {
    serverError: 'internal server error',
    deprc: (value: string) => `${value} is depreciated`,
    notAllowed: (value: string) => `${value} is not allowed`,
    serverClosed: 'dolphjs server closed',
    sigtermReceived: 'SIGTREM received',
    noDolphConfigFile:
        'dolphjs engine cannot start without dolph_config.yaml file, please ensure to add it to root directory',
};

export { DolphErrors };
