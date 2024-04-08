import clc from 'cli-color';

export const dolphMessages = {
  coreUtilMessage: (title: string, content: string) => `${clc.bold(clc.green(`[${title}]:`))} ${clc.greenBright(content)}`,
  middlewareMessages: (component: string, componentName: string) =>
    `Registered |${component} -------------> ${componentName}`,
  routeMessages: (methodName: string, req: string, method: string) =>
    `Registered | Route -------------> ${methodName} at ${req.toUpperCase()} ${method}`,
};
