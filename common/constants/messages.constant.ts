import clc from 'cli-color';

export const dolphMessages = {
  coreUtilMessage: (title: string, content: string) => `[${clc.green(clc.bold(title))}]: ${clc.greenBright(content)}`,
};
