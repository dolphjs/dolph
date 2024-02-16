import { DNextFunc, DRequest, DResponse } from '../../common';
import { AppController } from '../../samples/basic/app.controller';

describe('AppController', () => {
  let appController: AppController;

  beforeEach(() => {
    appController = new AppController();
  });

  describe('sendGreeting', () => {
    it('should send a greeting and a success response', () => {
      //@ts-expect-error
      const reqMock: DRequest = { body: { msg: 'hello there' } };
      //@ts-expect-error
      const resMock: DResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };

      const nextMock: DNextFunc = jest.fn();

      appController.sendGreeting(reqMock, resMock, nextMock);

      expect(resMock.status).toHaveBeenCalledWith();
      expect(resMock.json).toHaveBeenCalledWith({ msg: 'hello there' });
      expect(nextMock).toHaveBeenCalled();
    });
  });
});
