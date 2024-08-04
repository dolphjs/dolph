//@ts-nocheck
import { DRequest, DResponse, DNextFunc } from '../common';
import { TryCatchAsyncDec, TryCatchAsyncFn, TryCatchDec, TryCatchFn } from '../common';

describe('TryCatch Utilities', () => {
  let req: Partial<DRequest>;
  let res: Partial<DResponse>;
  let next: DNextFunc;

  beforeEach(() => {
    req = {};
    res = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn(),
    };
    next = jest.fn();
  });

  describe('TryCatchAsyncFn', () => {
    it('should call the next function with an error if the function throws', async () => {
      const error = new Error('Test error');
      const asyncFunction = TryCatchAsyncFn(async (req, res, next) => {
        throw error;
      });

      await asyncFunction(req as DRequest, res as DResponse, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call the original function if no error is thrown', async () => {
      const asyncFunction = TryCatchAsyncFn(async (req, res, next) => {
        res.status(200).json({ message: 'Success' });
      });

      await asyncFunction(req as DRequest, res as DResponse, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('TryCatchFn', () => {
    //     it('should call the next function with an error if the function throws', () => {
    //       const error = new Error('Test error');
    //       const syncFunction = TryCatchFn((req, res, next) => {
    //         throw error;
    //       });

    //       syncFunction(req as DRequest, res as DResponse, next);

    //       expect(next).toHaveBeenCalledWith(error);
    //     });

    it('should call the original function if no error is thrown', () => {
      const syncFunction = TryCatchFn((req, res, next) => {
        res.status(200).json({ message: 'Success' });
      });

      syncFunction(req as DRequest, res as DResponse, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('TryCatchAsyncDec', () => {
    it('should call the next function with an error if the method throws', async () => {
      const error = new Error('Test error');
      class TestClass {
        @TryCatchAsyncDec
        async method(req: DRequest, res: DResponse, next: DNextFunc) {
          throw error;
        }
      }

      const instance = new TestClass();
      await instance.method(req as DRequest, res as DResponse, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call the original method if no error is thrown', async () => {
      class TestClass {
        @TryCatchAsyncDec
        async method(req: DRequest, res: DResponse, next: DNextFunc) {
          res.status(200).json({ message: 'Success' });
        }
      }

      const instance = new TestClass();
      await instance.method(req as DRequest, res as DResponse, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('TryCatchDec', () => {
    it('should call the next function with an error if the method throws', () => {
      const error = new Error('Test error');
      class TestClass {
        @TryCatchDec
        method(req: DRequest, res: DResponse, next: DNextFunc) {
          throw error;
        }
      }

      const instance = new TestClass();
      instance.method(req as DRequest, res as DResponse, next);

      expect(next).toHaveBeenCalledWith(error);
    });

    it('should call the original method if no error is thrown', () => {
      class TestClass {
        @TryCatchDec
        method(req: DRequest, res: DResponse, next: DNextFunc) {
          res.status(200).json({ message: 'Success' });
        }
      }

      const instance = new TestClass();
      instance.method(req as DRequest, res as DResponse, next);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({ message: 'Success' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});
