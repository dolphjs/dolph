import { RequestHandler } from 'express';

class MiddlewareRegistry {
  private static instance: MiddlewareRegistry;
  private middlewares: RequestHandler[] = [];

  private constructor() {}

  public static getInstance(): MiddlewareRegistry {
    if (!MiddlewareRegistry.instance) {
      MiddlewareRegistry.instance = new MiddlewareRegistry();
    }

    return MiddlewareRegistry.instance;
  }

  public register(middleware: RequestHandler) {
    this.middlewares.push(middleware);
  }

  public getMiddlewares(): RequestHandler[] {
    return this.middlewares;
  }
}

export const middlewareRegistry = MiddlewareRegistry.getInstance();
