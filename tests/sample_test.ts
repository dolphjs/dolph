// import { AppController } from './path-to-your-controller';
// import { DRequest, DResponse } from './path-to-your-types'; // Import your request and response types
// import { BadRequestException } from './path-to-your-exceptions'; // Import your exception classes
// import { controllerServices } from './path-to-your-services'; // Import your services
// import { SuccessResponse } from './path-to-your-response-helpers'; // Import your response helper functions

// describe('AppController', () => {
//   let appController: AppController;

//   beforeEach(() => {
//     appController = new AppController();
//   });

//   describe('createUser', () => {
//     it('should create a user and return success response', async () => {
//       const reqMock: DRequest = { body: { height: 1.8, otherProperties: '...' } };
//       const resMock: DResponse = {
//         status: jest.fn().mockReturnThis(),
//         json: jest.fn(),
//       };

//       // Mock the necessary services or dependencies
//       const createUserSpy = jest
//         .spyOn(controllerServices.appservice, 'createUser')
//         .mockResolvedValueOnce({ userId: '123', username: 'testUser' });

//       const successResponseSpy = jest.spyOn(SuccessResponse, 'res');

//       // Call the createUser method
//       await appController.createUser(reqMock, resMock);

//       // Assertions
//       expect(createUserSpy).toHaveBeenCalledWith(reqMock.body);
//       expect(successResponseSpy).toHaveBeenCalledWith({
//         res: resMock,
//         body: { data: { userId: '123', username: 'testUser' }, file: undefined, payload: undefined },
//       });
//     });

//     it('should handle short height and throw BadRequestException', async () => {
//       const reqMock: DRequest = { body: { height: 1.6, otherProperties: '...' } };
//       const resMock: DResponse = {
//         status: jest.fn().mockReturnThis(),
//         json: jest.fn(),
//       };

//       // Call the createUser method and expect a BadRequestException to be thrown
//       await expect(appController.createUser(reqMock, resMock)).rejects.toThrow(BadRequestException);

//       // Assertions for any other expected behavior (e.g., response status code)
//       expect(resMock.status).toHaveBeenCalledWith(400);
//       expect(resMock.json).toHaveBeenCalledWith({ message: 'sorry, you are too short for this program' });
//     });
//   });
// });
