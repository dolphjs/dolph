import { DRequest, DRequestHandler } from '../common';
import { middlewareRegistry } from '../core';
import helmet from 'helmet';

describe('MiddlewareRegistry', () => {
  beforeEach(() => {
    // Reset the singleton instance and clear middlewares before each test
    (middlewareRegistry as any).middlewares = [];
  });

  it('should return a singleton instance', () => {
    const instance1 = middlewareRegistry;
    const instance2 = middlewareRegistry;
    expect(instance1).toBe(instance2);
  });

  it('should register a middleware', () => {
    const mockMiddleware: DRequestHandler = (req, res, next) => next();
    middlewareRegistry.register(mockMiddleware);

    const middlewares = middlewareRegistry.getMiddlewares();
    expect(middlewares.length).toBe(1);
    expect(middlewares[0]).toBe(mockMiddleware);
  });

  it('should register multiple middlewares', () => {
    const mockMiddleware1: DRequestHandler = (req, res, next) => next();
    const mockMiddleware2: DRequestHandler = (req, res, next) => next();
    middlewareRegistry.register(mockMiddleware1);
    middlewareRegistry.register(mockMiddleware2);

    const middlewares = middlewareRegistry.getMiddlewares();
    expect(middlewares.length).toBe(2);
    expect(middlewares).toContain(mockMiddleware1);
    expect(middlewares).toContain(mockMiddleware2);
  });

  it('should register and retrieve helmet middleware', () => {
    middlewareRegistry.register(helmet());

    const middlewares = middlewareRegistry.getMiddlewares();
    expect(middlewares.length).toBe(1);
    expect(typeof middlewares[0]).toBe('function');
  });
});
