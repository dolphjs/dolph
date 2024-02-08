import clc from 'cli-color';

export const dolphMessages = {
  coreUtilMessage: (title: string, content: string) => `${clc.bold(clc.green(`[${title}]:`))} ${clc.greenBright(content)}`,
};
