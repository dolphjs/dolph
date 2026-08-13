import clc from 'cli-color';

export const dolphMessages = {
    coreUtilMessage: (title: string, content: string) => `${clc.bold(clc.green(`[${title}]:`))} ${clc.greenBright(content)}`,
    middlewareMessages: (component: string, componentName: string) => `${component} {${componentName}} initialized`,
    // req/method are the HTTP verb and path respectively — kept as-is to
    // avoid touching every call site's argument order.
    routeMessages: (methodName: string, req: string, method: string) =>
        `Mapped {${method}, ${req.toUpperCase()}} route (${methodName})`,
};
