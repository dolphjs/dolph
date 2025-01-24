import { DolphControllerHandler } from '../../../../../classes';
import {
  Dolph,
  SuccessResponse,
  DRequest,
  DResponse,
  InternalServerErrorException,
  Middleware,
} from '../../../../../common';
import { Get, Post, Route, UseMiddleware } from '../../../../../decorators';
import { diskStorage, fileUploader, useFileUploader } from '../../../../../packages';

// const upload = fileUploader({
//   storage: diskStorage({
//     destination: './uploads',
//     filename: (req, file, cb) => {
//       cb(null, Date.now() + '-' + file.originalname);
//     },
//   }),
//   limits: {
//     fileSize: 5 * 1024 * 1024, // 5MB
//   },
// });

@Route('user')
export class UserController extends DolphControllerHandler<Dolph> {
  private name = 'utibe';
  constructor() {
    super();
  }

  @Get('greet')
  async greet(req: DRequest, res: DResponse) {
    SuccessResponse({ res, body: { message: "you've reached the user endpoint." } });
  }

  // Make a wrapper that returns the function : req: DRequest, res: DResponse, next: DNextFunc

  @Post('')
  @UseMiddleware(
    useFileUploader({
      type: 'single',
      fieldname: 'upload',
      // storage: diskStorage({
      //   destination: './uploads',
      //   filename: (req, file, cb) => {
      //     cb(null, Date.now() + '-' + file.originalname);
      //   },
      // }),
    }),
  )
  async post(req: DRequest, res: DResponse) {
    console.log('name: ', this.name);
    SuccessResponse({ res, body: req.body });
  }
}
